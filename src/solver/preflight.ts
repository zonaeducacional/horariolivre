import { AulaAgendada, MatrizCurricularItem, ProjetoHorario, SolverResult, Turno } from '../shared/types';
import { disponibilidade, janelaTempo, validarGrade } from '../shared/rules';

/** Necessary capacity checks, shared by the CSP and integer solver. */
export function verificarCapacidade(p: ProjetoHorario): SolverResult | null {
    const classes = new Map(p.turmas.map(t => [t.id, t]));
    const shifts = new Map(p.turnos.map(t => [t.id, t]));
    const shiftFor = (m: MatrizCurricularItem): Turno => shifts.get(classes.get(m.turmaId)!.turnoId)!;
    const fixed = p.gradeHorario.filter(a => a.fixaManual);
    const result = (status: 'impossivel', mensagem: string, grade: AulaAgendada[] = [], conflitos?: string[]): SolverResult => ({ status, sucesso: false, grade, mensagem, conflitos, tempoGastoMs: 0 });
        const fixedErrors = validarGrade(p, fixed, false, false);
        if (fixedErrors.length)
            return result('impossivel', 'Aulas fixas em conflito. Ajuste as fixações antes de gerar.', [], fixedErrors);
        for (const c of p.turmas) {
            const carga = p.matrizCurricular.filter(m => m.turmaId === c.id).reduce((sum, m) => sum + m.aulasSemanais, 0);
            if (carga > p.diasLetivos.length * shifts.get(c.turnoId)!.temposCount)
                return result('impossivel', `Carga da turma ${c.nome} excede a capacidade do turno.`);
        }
        const salas = new Map<string, typeof p.turmas>();
        for (const turma of p.turmas) {
            const sala = (turma.salaPadrao || '').trim().toLocaleLowerCase();
            if (!sala) continue;
            const chave = JSON.stringify([sala, turma.turnoId]);
            salas.set(chave, [...(salas.get(chave) || []), turma]);
        }
        const conflitosSalas: string[] = [];
        for (const turmas of salas.values()) {
            const turno = shifts.get(turmas[0].turnoId)!;
            const ids = new Set(turmas.map(t => t.id));
            const carga = p.matrizCurricular.filter(m => ids.has(m.turmaId)).reduce((sum, m) => sum + m.aulasSemanais, 0);
            const capacidade = p.diasLetivos.length * turno.temposCount;
            if (carga > capacidade)
                conflitosSalas.push(`Sala ${turmas[0].salaPadrao!.trim()}, turno ${turno.nome}: ${carga} aulas para ${capacidade} horários disponíveis. Turmas: ${turmas.map(t => t.nome).join(', ')}. Confira o turno e a sala de cada turma.`);
        }
        if (conflitosSalas.length)
            return result('impossivel', 'A carga das turmas excede a capacidade de uma sala no mesmo turno.', [], conflitosSalas);
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
    return null;
}
