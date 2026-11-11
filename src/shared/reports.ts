import { ProjetoHorario } from './types';
import { exigirGradePublicavel, janelaTempo } from './rules';
export const DIAS = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const hora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export function tabelasProfessor(p: ProjetoHorario, professorId: string, validar = true) {
    if (validar)
        exigirGradePublicavel(p);
    if (!p.professores.some(prof => prof.id === professorId))
        return [];
    return p.turnos.filter(turno => p.gradeHorario.some(a => a.professorId === professorId && p.turmas.find(t => t.id === a.turmaId)?.turnoId === turno.id)).map(turno => ({
        turno,
        rows: Array.from({ length: turno.temposCount }, (_, i) => {
            const janela = janelaTempo(turno, i + 1);
            return [`${i + 1}º (${hora(janela.inicioMin)}-${hora(janela.fimMin)})`, ...p.diasLetivos.map(dia => {
                    const aula = p.gradeHorario.find(a => a.professorId === professorId && a.diaSemana === dia && a.tempoNumero === i + 1 && p.turmas.find(t => t.id === a.turmaId)?.turnoId === turno.id);
                    return aula ? `${p.turmas.find(t => t.id === aula.turmaId)!.sigla} - ${p.disciplinas.find(d => d.id === aula.disciplinaId)!.sigla}` : '-';
                })];
        }),
    }));
}
export function nomeAbaExcel(nome: string, existentes: string[]): string {
    const base = (nome.replace(/[:\\/?*\[\]\x00-\x1f]/g, ' ').replace(/^'+|'+$/g, '').trim() || 'Horário').slice(0, 31);
    let candidate = base, index = 2;
    const usados = new Set(existentes.map(s => s.toLocaleLowerCase()));
    while (usados.has(candidate.toLocaleLowerCase()) || candidate.toLocaleLowerCase() === 'history') {
        const suffix = ` (${index++})`;
        candidate = base.slice(0, 31 - suffix.length) + suffix;
    }
    return candidate;
}
