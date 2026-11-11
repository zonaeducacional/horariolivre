import { AulaAgendada, MatrizCurricularItem, ProjetoHorario, SolverProgress, SolverResult, Turno } from '../shared/types';
import { disponibilidade, janelaTempo, sobrepoe, validarEstrutura, validarGrade } from '../shared/rules';
interface Block {
    item: MatrizCurricularItem;
    size: number;
}
export interface SolverOptions {
    maxIterations?: number;
    maxTimeMs?: number;
    cancelFlag?: Int32Array;
}
/** CSP backtracking: real time overlaps are hard constraints; pairing/windows are preferences. */
export class TimetableCspSolver {
    private cancelled = false;
    /** Per-run counters, kept outside the persisted project and worker protocol. */
    readonly diagnostics = { nodes: 0, domains: 0, backtracks: 0, prunes: 0, candidateSlots: 0, accepted: 0, setupMs: 0, searchMs: 0, firstSolutionMs: 0 };
    constructor(private projeto: ProjetoHorario, private onProgress?: (p: SolverProgress) => void, private options: SolverOptions = {}) { }
    cancel(): void { this.cancelled = true; }
    solve(): SolverResult {
        Object.assign(this.diagnostics, {nodes:0, domains:0, backtracks:0, prunes:0, candidateSlots:0, accepted:0, setupMs:0, searchMs:0, firstSolutionMs:0});
        const start = Date.now();
        const result = (status: NonNullable<SolverResult['status']>, mensagem: string, grade: AulaAgendada[] = [], conflitos?: string[]): SolverResult => ({ status, sucesso: status === 'sucesso', grade, mensagem, conflitos, tempoGastoMs: Date.now() - start });
        try {
            validarEstrutura(this.projeto);
        }
        catch (e) {
            return result('erro', e instanceof Error ? e.message : 'Projeto inválido.');
        }
        const p = this.projeto;
        const classes = new Map(p.turmas.map(t => [t.id, t]));
        const shifts = new Map(p.turnos.map(t => [t.id, t]));
        const teachers = new Map(p.professores.map(t => [t.id, t]));
        const shiftFor = (m: MatrizCurricularItem): Turno => shifts.get(classes.get(m.turmaId)!.turnoId)!;
        const total = p.matrizCurricular.reduce((sum, m) => sum + m.aulasSemanais, 0);
        const fixed = p.gradeHorario.filter(a => a.fixaManual).map(a => ({ ...a }));
        const fixedErrors = validarGrade(p, fixed, false, false);
        if (fixedErrors.length)
            return result('impossivel', 'Aulas fixas em conflito. Ajuste as fixações antes de gerar.', [], fixedErrors);
        for (const c of p.turmas) {
            const carga = p.matrizCurricular.filter(m => m.turmaId === c.id).reduce((sum, m) => sum + m.aulasSemanais, 0);
            if (carga > p.diasLetivos.length * shifts.get(c.turnoId)!.temposCount)
                return result('impossivel', `Carga da turma ${c.nome} excede a capacidade do turno.`);
        }
        for (const prof of p.professores) {
            const assigned = p.matrizCurricular.filter(m => m.professorId === prof.id);
            const carga = assigned.reduce((sum, m) => sum + m.aulasSemanais, 0);
            // Count unique available real windows, including all assigned shifts; overlap remains a search constraint.
            let capacity = 0;
            for (const day of p.diasLetivos) {
                const windows = new Set<string>();
                for (const m of assigned) {
                    const turno = shiftFor(m);
                    for (let t = 1; t <= turno.temposCount; t++)
                        if (disponibilidade(p, prof.id, day, t, turno.id) !== 0) {
                            const w = janelaTempo(turno, t);
                            windows.add(`${w.inicioMin}:${w.fimMin}`);
                        }
                }
                capacity += Math.min(prof.limiteAulasDia, windows.size);
            }
            if (carga > capacity)
                return result('impossivel', `Professor ${prof.nome}: ${carga} aulas para capacidade máxima de ${capacity}.`);
        }
        let iterations = 0, limit = false, lastProgress = 0;
        const isCancelled = () => this.cancelled || !!(this.options.cancelFlag && Atomics.load(this.options.cancelFlag, 0));
        const bounded = () => { if (isCancelled())
            return true; if (iterations >= (this.options.maxIterations ?? 250000) || Date.now() - start >= (this.options.maxTimeMs ?? 30000)) {
            limit = true;
            return true;
        } return false; };
        const fixedCount = new Map<string, number>();
        for (const a of fixed)
            fixedCount.set(a.matrizItemId, (fixedCount.get(a.matrizItemId) || 0) + 1);
        const run = (pair: boolean): AulaAgendada[] | null => {
            const setupStart=Date.now();
            const grid = [...fixed];
            const items = new Map(p.matrizCurricular.map(m => [m.id, m]));
            const groupKey = (m: MatrizCurricularItem) => JSON.stringify([m.turmaId,m.disciplinaId]);
            const groupLoads = new Map<string,number>();
            const groupCounts = new Map<string,number>();
            const groupDays = new Map<string,AulaAgendada[]>();
            for(const m of p.matrizCurricular) groupLoads.set(groupKey(m),(groupLoads.get(groupKey(m))||0)+m.aulasSemanais);
            const windowCache = new Map(p.turnos.map(t=>[t.id,Array.from({length:t.temposCount},(_,i)=>janelaTempo(t,i+1))]));
            const availability = new Map(p.matrizCurricular.map(m=>[m.id,new Map(p.diasLetivos.map(day=>[day,Array.from({length:shiftFor(m).temposCount},(_,i)=>disponibilidade(p,m.professorId,day,i+1,shiftFor(m).id))]))]));
            const windowAt = (t:Turno,n:number)=>windowCache.get(t.id)![n-1];
            const blockKey = (b:Block)=>JSON.stringify([b.item.id,b.size]);
            const degree = new Map(p.matrizCurricular.map(m=>[m.id,p.matrizCurricular.filter(other=>other.id!==m.id&&(other.turmaId===m.turmaId||other.professorId===m.professorId)).reduce((n,other)=>n+other.aulasSemanais,0)]));
            const usedIds=new Set(fixed.map(a=>a.id));
            const blocks: Block[] = [];
            for (const m of p.matrizCurricular) {
                let remaining = m.aulasSemanais - (fixedCount.get(m.id) || 0);
                while (remaining > 0) {
                    const size = pair && m.permiteGeminada && m.maximoAulasDia >= 2 && remaining >= 2 ? 2 : 1;
                    blocks.push({ item: m, size });
                    remaining -= size;
                }
            }
            const slotKeys = new Set<string>();
            const profWindows = new Map<string, ReturnType<typeof janelaTempo>[]>(), roomWindows = new Map<string, ReturnType<typeof janelaTempo>[]>();
            const profDaily = new Map<string, number>(), itemDaily = new Map<string, number>();
            const key = (...parts: (string | number)[]) => JSON.stringify(parts);
            const roomFor = (m: MatrizCurricularItem) => (classes.get(m.turmaId)!.salaPadrao || '').trim().toLocaleLowerCase();
            const add = (a: AulaAgendada) => { const m = items.get(a.matrizItemId)!; const gk=groupKey(m),gdk=key(gk,a.diaSemana); groupCounts.set(gk,(groupCounts.get(gk)||0)+1); groupDays.set(gdk,[...(groupDays.get(gdk)||[]),a]); const w = windowAt(shiftFor(m), a.tempoNumero), pk = key(a.professorId, a.diaSemana), rk = key(roomFor(m), a.diaSemana), mk = key(m.id, a.diaSemana); slotKeys.add(key(a.turmaId, a.diaSemana, a.tempoNumero)); profWindows.set(pk, [...(profWindows.get(pk) || []), w]); if (roomFor(m))
                roomWindows.set(rk, [...(roomWindows.get(rk) || []), w]); profDaily.set(pk, (profDaily.get(pk) || 0) + 1); itemDaily.set(mk, (itemDaily.get(mk) || 0) + 1); };
            for (const a of fixed)
                add(a);
            const candidates = (b: Block) => {
                this.diagnostics.domains++;
                const m = b.item, turno = shiftFor(m), prof = teachers.get(m.professorId)!;
                const out: {
                    day: number;
                    time: number;
                    penalty: number;
                }[] = [];
                for (const day of p.diasLetivos) {
                    const pk = key(prof.id, day), rk = key(roomFor(m), day), mk = key(m.id, day);
                    if ((profDaily.get(pk) || 0) + b.size > prof.limiteAulasDia || (itemDaily.get(mk) || 0) + b.size > m.maximoAulasDia)
                        continue;
                    const same = groupDays.get(key(groupKey(m),day)) || [];
                    if (!m.permiteGeminada && same.length)
                        continue;
                    for (let time = 1; time <= turno.temposCount - b.size + 1; time++) {
                        this.diagnostics.candidateSlots++;
                        let valid = true, penalty = 0;
                        for (let offset = 0; offset < b.size; offset++) {
                            const t = time + offset, w = windowAt(turno, t);
                            if (slotKeys.has(key(m.turmaId, day, t)) || availability.get(m.id)!.get(day)![t-1] === 0 || (profWindows.get(pk) || []).some(oc => sobrepoe(w, oc)) || (roomFor(m) && (roomWindows.get(rk) || []).some(oc => sobrepoe(w, oc)))) {
                                valid = false;
                                break;
                            }
                            if (offset && windowAt(turno, t - 1).fimMin !== w.inicioMin) {
                                valid = false;
                                break;
                            }
                            if (availability.get(m.id)!.get(day)![t-1] !== 2)
                                penalty += 1;
                        }
                        if (!valid)
                            continue;
                        const positions = [...same.map(a => a.tempoNumero), ...Array.from({ length: b.size }, (_, i) => time + i)].sort((a, b) => a - b);
                        // A gap may be filled later, but not across a break or another subject.
                        let gaps = 0;
                        for (let t = positions[0]; t < positions[positions.length - 1]; t++) {
                            if (windowAt(turno, t).fimMin !== windowAt(turno, t + 1).inicioMin) {
                                valid = false;
                                break;
                            }
                            if (!positions.includes(t)) {
                                gaps++;
                                if (slotKeys.has(key(m.turmaId, day, t)))
                                    valid = false;
                            }
                        }
                        if (!valid || gaps > (groupLoads.get(groupKey(m))||0) - (groupCounts.get(groupKey(m))||0) - b.size)
                            continue;
                        if (prof.evitarJanelas && (profWindows.get(pk) || []).length) {
                            const first = windowAt(turno, time).inicioMin, last = windowAt(turno, time + b.size - 1).fimMin;
                            if (!(profWindows.get(pk) || []).some(w => w.fimMin === first || w.inicioMin === last))
                                penalty += 2;
                        }
                        // Prefer completing a same-day contiguous block over dispersing it, without imposing pairing.
                        if (m.permiteGeminada && !same.length)
                            penalty += 1;
                        this.diagnostics.accepted++;
                        out.push({ day, time, penalty });
                    }
                }
                return out.sort((a, b) => a.penalty - b.penalty);
            };
            const search = (remaining: Block[]): boolean => {
                if (bounded())
                    return false;
                iterations++; this.diagnostics.nodes++;
                if (!remaining.length)
                    return validarGrade(p, grid, true).length === 0;
                // Dual MRV: choose either an item block or a required empty class slot.
                // Slot constraints expose dead ends much earlier in fully loaded classes.
                type Choice = { index:number; day:number; time:number; penalty:number };
                let choices:Choice[]=[];
                const seen=new Set<string>();
                const coverage=new Map<string,Choice[]>();
                const classRemaining=new Map<string,number>();
                for(const b of remaining) classRemaining.set(b.item.turmaId,(classRemaining.get(b.item.turmaId)||0)+b.size);
                let bestDegree=-1;
                for(let i=0;i<remaining.length;i++){
                    const b=remaining[i],bk=blockKey(b);
                    if(seen.has(bk)) continue;
                    seen.add(bk);
                    const domain=candidates(b).map(c=>({...c,index:i}));
                    const multiplicity=remaining.filter(other=>blockKey(other)===bk).length;
                    const union=new Set(domain.flatMap(c=>Array.from({length:b.size},(_,offset)=>key(c.day,c.time+offset))));
                    if(domain.length<multiplicity||union.size<multiplicity*b.size){this.diagnostics.prunes++;return false;}
                    if(!choices.length||domain.length<choices.length||(domain.length===choices.length&&degree.get(b.item.id)!>bestDegree)){
                        choices=domain;bestDegree=degree.get(b.item.id)!;
                    }
                    for(const c of domain)for(let offset=0;offset<b.size;offset++){
                        const sk=key(b.item.turmaId,c.day,c.time+offset);
                        const entries=coverage.get(sk)||[];entries.push(c);coverage.set(sk,entries);
                    }
                }
                for(const [classId,load] of classRemaining){
                    const turno=shifts.get(classes.get(classId)!.turnoId)!;
                    let empty=0;
                    for(const day of p.diasLetivos)for(let time=1;time<=turno.temposCount;time++)if(!slotKeys.has(key(classId,day,time)))empty++;
                    if(load!==empty)continue; // Optional slots must not be forced.
                    for(const day of p.diasLetivos)for(let time=1;time<=turno.temposCount;time++){
                        const sk=key(classId,day,time);
                        if(slotKeys.has(sk))continue;
                        const domain=coverage.get(sk)||[];
                        if(!domain.length){this.diagnostics.prunes++;return false;}
                        if(domain.length<choices.length)choices=domain;
                    }
                }
                for (const c of choices) {
                    if (bounded()) return false;
                    const b=remaining[c.index],rest=remaining.filter((_,i)=>i!==c.index);
                    const before = grid.length, pk = key(b.item.professorId, c.day), rk = key(roomFor(b.item), c.day), mk = key(b.item.id, c.day);
                    const pw = profWindows.get(pk) || [], rw = roomWindows.get(rk) || [], pc = profDaily.get(pk) || 0, mc = itemDaily.get(mk) || 0;
                    for (let i = 0; i < b.size; i++) {
                        const baseId=`aula-${b.item.id}-${c.day}-${c.time+i}`;
                        let id=baseId,suffix=2;
                        while(usedIds.has(id))id=`${baseId}-gerada-${suffix++}`;
                        usedIds.add(id);
                        const a: AulaAgendada = { id, matrizItemId: b.item.id, turmaId: b.item.turmaId, disciplinaId: b.item.disciplinaId, professorId: b.item.professorId, diaSemana: c.day, tempoNumero: c.time + i, fixaManual: false };
                        grid.push(a);
                        add(a);
                    }
                    if (Date.now() - lastProgress > 100) {
                        lastProgress = Date.now();
                        this.onProgress?.({ progressoPorcento: Math.min(99, Math.round(grid.length / Math.max(total, 1) * 100)), etapa: 'Buscando uma grade válida...', aulasAlocadas: grid.length, totalAulas: total, conflitosRestantes: rest.length });
                    }
                    if (search(rest))
                        return true;
                    this.diagnostics.backtracks++;
                    for (const a of grid.splice(before)){
                        const gk=groupKey(b.item),gdk=key(gk,a.diaSemana);
                        groupCounts.set(gk,groupCounts.get(gk)!-1);
                        groupDays.set(gdk,groupDays.get(gdk)!.filter(v=>v.id!==a.id));
                        slotKeys.delete(key(a.turmaId, a.diaSemana, a.tempoNumero));
                        usedIds.delete(a.id);
                    }
                    profWindows.set(pk, pw);
                    roomWindows.set(rk, rw);
                    profDaily.set(pk, pc);
                    itemDaily.set(mk, mc);
                }
                return false;
            };
            this.diagnostics.setupMs+=Date.now()-setupStart;
            const searchStart=Date.now();
            const found=search(blocks);
            this.diagnostics.searchMs+=Date.now()-searchStart;
            if(found)this.diagnostics.firstSolutionMs=Date.now()-start;
            return found ? grid : null;
        };
        try {
            let grade = run(true);
            // Pairing is a preference: exhaust a singles search before declaring impossibility.
            if (!grade && !bounded())
                grade = run(false);
            if (isCancelled())
                return result('cancelado', 'Cálculo interrompido. A última grade foi preservada.');
            if (!grade)
                return limit ? result('limite', `${iterations >= (this.options.maxIterations ?? 250000) ? 'Limite de nós' : 'Limite de tempo'} atingido. Não foi provado que a configuração é impossível.`) : result('impossivel', 'Nenhuma solução atende às restrições obrigatórias e às aulas fixas.');
            const errors = validarGrade(p, grade, true);
            if (errors.length)
                return result('erro', 'Validação final rejeitou a grade.', [], errors);
            this.onProgress?.({ progressoPorcento: 100, etapa: 'Grade validada.', aulasAlocadas: grade.length, totalAulas: total, conflitosRestantes: 0 });
            return result('sucesso', `Grade validada: ${grade.length} aulas, sem choques de professor ou sala.`, grade);
        }
        catch (e) {
            return result('erro', `Erro interno: ${e instanceof Error ? e.message : 'falha no algoritmo'}.`);
        }
    }
}
