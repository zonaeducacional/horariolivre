import fs from 'fs';
import loadHighs, { Highs, ModelData } from 'highs';
import { AulaAgendada, MatrizCurricularItem, ProjetoHorario, SolverProgress, SolverResult } from '../shared/types';
import { disponibilidade, janelaTempo, validarEstrutura, validarGrade } from '../shared/rules';
import { SolverOptions } from './cspSolver';
import { verificarCapacidade } from './preflight';

let runtime: Promise<Highs> | undefined;
const getRuntime = () => runtime ??= loadHighs({ wasmBinary: fs.readFileSync(require.resolve('highs/runtime')) });
const key = (...parts: (string | number)[]) => JSON.stringify(parts);
type Term = [number, number];
interface Position {
    index: number;
    item: MatrizCurricularItem;
    day: number;
    time: number;
    window: ReturnType<typeof janelaTempo>;
}
class Stopped extends Error {
    constructor(readonly status: 'cancelado' | 'limite') { super(status); }
}

/** Binary assignment + contiguous daily blocks. No Python, server, or network. */
export async function solveTimetable(p: ProjetoHorario, onProgress?: (p: SolverProgress) => void, options: SolverOptions = {}): Promise<SolverResult> {
    const start = Date.now(), maxTime = options.maxTimeMs ?? 30000;
    const cancelled = () => !!(options.cancelFlag && Atomics.load(options.cancelFlag, 0));
    const result = (status: NonNullable<SolverResult['status']>, mensagem: string, grade: AulaAgendada[] = [], conflitos?: string[]): SolverResult => ({
        status, sucesso: status === 'sucesso', mensagem, grade, conflitos, tempoGastoMs: Date.now() - start,
    });
    const check = () => {
        if (cancelled()) throw new Stopped('cancelado');
        if (Date.now() - start >= maxTime) throw new Stopped('limite');
    };
    try {
        validarEstrutura(p);
        check();
        const capacityError = verificarCapacidade(p);
        if (capacityError) return { ...capacityError, tempoGastoMs: Date.now() - start };
        if ((options.maxIterations ?? 250000) <= 0) throw new Stopped('limite');
        const total = p.matrizCurricular.reduce((sum, m) => sum + m.aulasSemanais, 0);
        const progress = (value: number, etapa: string) => onProgress?.({ progressoPorcento: value, etapa, aulasAlocadas: value === 100 ? total : 0, totalAulas: total, conflitosRestantes: value === 100 ? 0 : total });
        progress(0, 'Preparando as restrições dos dias de trabalho...');
        if (!total) {
            progress(100, 'Grade validada.');
            return result('sucesso', 'Grade validada: nenhuma aula a alocar.');
        }
        const highs = await getRuntime();
        check();
        const classes = new Map(p.turmas.map(c => [c.id, c]));
        const shifts = new Map(p.turnos.map(t => [t.id, t]));
        const shiftFor = (m: MatrizCurricularItem) => shifts.get(classes.get(m.turmaId)!.turnoId)!;
        const positions: Position[] = [], byItem = new Map<string, Position[]>();
        const classSlots = new Map<string, number[]>(), teacherDays = new Map<string, Position[]>(), roomDays = new Map<string, Position[]>();
        const groups = new Map<string, MatrizCurricularItem[]>();
        const cost: number[] = [], lower: number[] = [], upper: number[] = [];
        const indices: number[] = [], coefficients: number[] = [], starts = [0], rowLower: number[] = [], rowUpper: number[] = [];
        const variable = (weight = 0, allowed = true) => {
            check();
            const index = cost.length;
            cost.push(weight); lower.push(0); upper.push(allowed ? 1 : 0);
            return index;
        };
        const row = (terms: Term[], min = -highs.infinity, max = highs.infinity) => {
            check();
            // CSR requires one coefficient per column, including weighted avulsa constraints.
            const combined = new Map<number, number>();
            for (const [index, value] of terms) combined.set(index, (combined.get(index) || 0) + value);
            for (const [index, value] of [...combined].sort((a, b) => a[0] - b[0])) if (value) { indices.push(index); coefficients.push(value); }
            starts.push(indices.length); rowLower.push(min); rowUpper.push(max);
        };
        const ones = (columns: number[]): Term[] => columns.map(index => [index, 1]);
        for (const m of p.matrizCurricular) {
            const shift = shiftFor(m), list: Position[] = [];
            const group = key(m.turmaId, m.disciplinaId);
            groups.set(group, [...(groups.get(group) || []), m]);
            for (const day of p.diasLetivos) for (let time = 1; time <= shift.temposCount; time++) {
                const status = disponibilidade(p, m.professorId, day, time, shift.id);
                const index = variable(status === 2 ? -0.05 : 0, status !== 0);
                const pos = { index, item: m, day, time, window: janelaTempo(shift, time) };
                positions.push(pos); list.push(pos);
                const ck = key(m.turmaId, day, time), tk = key(m.professorId, day);
                classSlots.set(ck, [...(classSlots.get(ck) || []), index]);
                teacherDays.set(tk, [...(teacherDays.get(tk) || []), pos]);
                const room = (classes.get(m.turmaId)!.salaPadrao || '').trim().toLocaleLowerCase();
                if (room) { const rk = key(room, day); roomDays.set(rk, [...(roomDays.get(rk) || []), pos]); }
            }
            byItem.set(m.id, list);
            row(ones(list.map(a => a.index)), m.aulasSemanais, m.aulasSemanais);
            for (const day of p.diasLetivos) row(ones(list.filter(a => a.day === day).map(a => a.index)), -highs.infinity, m.maximoAulasDia);
        }
        for (const columns of classSlots.values()) row(ones(columns), -highs.infinity, 1);
        // One clique at each real starting instant catches partially overlapping shifts too.
        const collisions = (entries: Position[]) => {
            for (const time of new Set(entries.map(a => a.window.inicioMin))) {
                row(ones(entries.filter(a => a.window.inicioMin <= time && time < a.window.fimMin).map(a => a.index)), -highs.infinity, 1);
            }
        };
        for (const prof of p.professores) for (const day of p.diasLetivos) {
            const entries = teacherDays.get(key(prof.id, day)) || [];
            row(ones(entries.map(a => a.index)), -highs.infinity, prof.limiteAulasDia);
            collisions(entries);
            if (prof.evitarJanelas) {
                const windows = new Map<string, Position[]>();
                for (const pos of entries) {
                    const wk = key(pos.window.inicioMin, pos.window.fimMin);
                    windows.set(wk, [...(windows.get(wk) || []), pos]);
                }
                // Soft reward for neighboring lessons, even across different classes/subjects.
                // No occupancy is required: lack of adjacency never makes a schedule infeasible.
                for (const left of windows.values()) for (const right of windows.values()) {
                    if (left[0].window.fimMin !== right[0].window.inicioMin) continue;
                    const adjacent = variable(-0.02);
                    row([[adjacent, 1], ...left.map((a): Term => [a.index, -1])], -highs.infinity, 0);
                    row([[adjacent, 1], ...right.map((a): Term => [a.index, -1])], -highs.infinity, 0);
                }
            }
        }
        for (const entries of roomDays.values()) collisions(entries);
        for (const items of groups.values()) {
            const shift = shiftFor(items[0]), n = shift.temposCount;
            let maxDaily = Math.min(n, items.reduce((sum, m) => sum + m.maximoAulasDia, 0));
            if (items.every(m => !m.permiteGeminada)) maxDaily = 1;
            for (const day of p.diasLetivos) {
                const entries = items.flatMap(m => byItem.get(m.id)!.filter(a => a.day === day));
                row(ones(entries.map(a => a.index)), -highs.infinity, maxDaily);
                if (maxDaily > 1) {
                    // An occupied slot after an empty slot (or a break) starts a block.
                    // At most one start gives exactly the same contiguous daily intervals
                    // without enumerating every possible interval and empty pattern.
                    const blockStarts: number[] = [];
                    for (let time = 1; time <= n; time++) {
                        // Minimizing starts is equivalent to rewarding adjacent lessons:
                        // the weekly lesson count is fixed, so pairs = lessons - blocks.
                        const blockStart = variable(1);
                        blockStarts.push(blockStart);
                        const adjacent = time > 1 && janelaTempo(shift, time - 1).fimMin === janelaTempo(shift, time).inicioMin;
                        row([
                            ...ones(entries.filter(a => a.time === time).map(a => a.index)),
                            ...(adjacent ? entries.filter(a => a.time === time - 1).map((a): Term => [a.index, -1]) : []),
                            [blockStart, -1],
                        ], -highs.infinity, 0);
                    }
                    row(ones(blockStarts), -highs.infinity, 1);
                }
                const singles = entries.filter(a => !a.item.permiteGeminada);
                if (singles.length) row([...ones(entries.map(a => a.index)), ...singles.map((a): Term => [a.index, n])], -highs.infinity, n + 1);
            }
        }
        const fixed = p.gradeHorario.filter(a => a.fixaManual);
        const fixedBySlot = new Map(fixed.map(a => [key(a.matrizItemId, a.diaSemana, a.tempoNumero), a]));
        for (const a of fixed) {
            const pos = byItem.get(a.matrizItemId)!.find(pos => pos.day === a.diaSemana && pos.time === a.tempoNumero)!;
            lower[pos.index] = upper[pos.index] = 1;
        }
        const data: ModelData = {
            numCols: cost.length, numRows: rowLower.length, colCost: cost, colLower: lower, colUpper: upper,
            rowLower, rowUpper, integrality: new Int32Array(cost.length).fill(1),
            matrix: { format: 'csr', numRows: rowLower.length, numCols: cost.length, starts, indices, values: coefficients },
        };
        check();
        const model = highs.createModel(data);
        try {
            check();
            model.options.set({ output_flag: false, time_limit: Math.max(0.001, (maxTime - (Date.now() - start)) / 1000), mip_max_nodes: options.maxIterations ?? 250000, mip_max_improving_sols: 1 });
            progress(20, 'Buscando uma grade que respeite todos os dias e limites...');
            const interrupt = (event: { interrupt(): void }): undefined => { if (cancelled() || Date.now() - start >= maxTime) event.interrupt(); return undefined; };
            const solved = model.run({
                [highs.constants.callbackType.mipInterrupt]: interrupt,
                [highs.constants.callbackType.simplexInterrupt]: interrupt,
                [highs.constants.callbackType.ipmInterrupt]: interrupt,
            });
            if (cancelled()) throw new Stopped('cancelado');
            if (solved.modelStatus === highs.constants.modelStatus.infeasible) return result('impossivel', 'Nenhuma solução atende às cargas, aos dias disponíveis, aos limites diários e às aulas fixas.');
            if (model.info.get('primal_solution_status') !== highs.constants.solutionStatus.feasible) {
                if ([highs.constants.modelStatus.timeLimit, highs.constants.modelStatus.iterationLimit, highs.constants.modelStatus.solutionLimit, highs.constants.modelStatus.interrupted].some(status => status === solved.modelStatus)) throw new Stopped('limite');
                return result('erro', 'O motor não produziu uma solução válida. A última grade foi preservada.');
            }
            const solution = model.getSolution().colValue, grade: AulaAgendada[] = [];
            const used = new Set(fixed.map(a => a.id));
            for (const pos of positions) if (solution[pos.index] > 0.5) {
                const saved = fixedBySlot.get(key(pos.item.id, pos.day, pos.time));
                if (saved) { grade.push({ ...saved }); continue; }
                const base = `aula-${pos.item.id}-${pos.day}-${pos.time}`;
                let id = base, suffix = 2;
                while (used.has(id)) id = `${base}-gerada-${suffix++}`;
                used.add(id);
                grade.push({ id, matrizItemId: pos.item.id, turmaId: pos.item.turmaId, disciplinaId: pos.item.disciplinaId, professorId: pos.item.professorId, diaSemana: pos.day, tempoNumero: pos.time, fixaManual: false });
            }
            progress(95, 'Conferindo cargas, dias de trabalho e conflitos...');
            const errors = validarGrade(p, grade, true);
            if (errors.length) return result('erro', 'Validação final rejeitou a grade. A última grade foi preservada.', [], errors);
            progress(100, 'Grade completa e validada.');
            return result('sucesso', `Grade validada: ${grade.length} aulas, sem choques de professor ou sala.`, grade);
        } finally { model.dispose(); }
    } catch (error) {
        if (error instanceof Stopped) return error.status === 'cancelado'
            ? result('cancelado', 'Cálculo interrompido. A última grade foi preservada.')
            : result('limite', 'Limite de busca atingido. Não foi provado que a configuração é impossível. A última grade foi preservada.');
        return result('erro', `Erro no cálculo: ${error instanceof Error ? error.message : 'falha interna'}.`);
    }
}
