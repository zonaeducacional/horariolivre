import * as XLSX from 'xlsx';
import { ProjetoHorario } from '../shared/types';
import { exigirGradePublicavel, janelaTempo } from '../shared/rules';
import { DIAS, hora, nomeAbaExcel, tabelasProfessor } from '../shared/reports';
export function criarWorkbook(projeto: ProjetoHorario) {
    exigirGradePublicavel(projeto);
    const wb = XLSX.utils.book_new();
    const diasNomes = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    // 1. Planilhas do Quadro Geral por Turno (as primeiras abas do Excel)
    for (const turno of projeto.turnos) {
        const turmasDoTurno = projeto.turmas.filter((t) => t.turnoId === turno.id);
        if (turmasDoTurno.length === 0)
            continue;
        const maxTempos = turno.temposCount || 5;
        const rows: any[] = [];
        // Linha 1: Título Oficial
        rows.push([
            `${projeto.nomeEscola || 'Horário Escolar'} - QUADRO GERAL: TURNO ${turno.nome.toUpperCase()} - ANO ${projeto.anoLetivo}`,
        ]);
        rows.push([]);
        // Linha 3: Cabeçalho com Dias da Semana
        const headerDias: string[] = ['Turma'];
        for (const dia of projeto.diasLetivos) {
            for (let t = 1; t <= maxTempos; t++) {
                headerDias.push(t === 1 ? diasNomes[dia] : '');
            }
        }
        rows.push(headerDias);
        // Linha 4: Tempos de Aula (1º, 2º, 3º...)
        const headerTempos: string[] = [''];
        for (const _dia of projeto.diasLetivos) {
            for (let t = 1; t <= maxTempos; t++) {
                headerTempos.push(`${t}º`);
            }
        }
        rows.push(headerTempos);
        // Linhas das Turmas
        for (const turma of turmasDoTurno) {
            const rowData: string[] = [`${turma.nome} (${turma.sigla})`];
            for (const dia of projeto.diasLetivos) {
                for (let t = 1; t <= maxTempos; t++) {
                    const aula = projeto.gradeHorario.find((a) => a.turmaId === turma.id && a.diaSemana === dia && a.tempoNumero === t);
                    if (aula) {
                        const disc = projeto.disciplinas.find((d) => d.id === aula.disciplinaId)?.sigla || '';
                        const prof = projeto.professores.find((p) => p.id === aula.professorId)?.sigla || '';
                        rowData.push(`${disc} (${prof})`);
                    }
                    else {
                        rowData.push('-');
                    }
                }
            }
            rows.push(rowData);
        }
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const nomeAba = `Geral ${turno.nome}`.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, nomeAbaExcel(nomeAba, wb.SheetNames));
    }
    // 2. Planilhas Individuais por Turma
    for (const turma of projeto.turmas) {
        const rows: any[] = [];
        const turno = projeto.turnos.find((t) => t.id === turma.turnoId);
        const maxTempos = turno?.temposCount || 5;
        // Cabeçalho dos dias
        const headers = ['Tempo / Horário', ...projeto.diasLetivos.map((d) => diasNomes[d])];
        rows.push(headers);
        for (let t = 1; t <= maxTempos; t++) {
            const janela=janelaTempo(turno!,t);
            const rowData: string[] = [`${t}º Tempo (${hora(janela.inicioMin)}-${hora(janela.fimMin)})`];
            for (const dia of projeto.diasLetivos) {
                const aula = projeto.gradeHorario.find((a) => a.turmaId === turma.id && a.diaSemana === dia && a.tempoNumero === t);
                if (aula) {
                    const disc = projeto.disciplinas.find((d) => d.id === aula.disciplinaId)?.nome || '';
                    const prof = projeto.professores.find((p) => p.id === aula.professorId)?.sigla || '';
                    rowData.push(`${disc} (${prof})`);
                }
                else {
                    rowData.push('-');
                }
            }
            rows.push(rowData);
        }
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, nomeAbaExcel(turma.sigla || turma.nome, wb.SheetNames));
    }
    for (const prof of projeto.professores) {
        const rows: string[][] = [[prof.nome, `${projeto.gradeHorario.filter(a => a.professorId === prof.id).length} aulas semanais`]];
        for (const table of tabelasProfessor(projeto, prof.id))
            rows.push([table.turno.nome], ['Tempo / Horário', ...projeto.diasLetivos.map(d => DIAS[d])], ...table.rows, []);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), nomeAbaExcel(`Prof ${prof.sigla}`, wb.SheetNames));
    }
    return wb;
}
