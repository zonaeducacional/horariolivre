import { ProjetoHorario } from './types';
import { CURRENT_VERSION } from './rules';

export function criarProjetoPadrao(): ProjetoHorario {
  return {
    versao: CURRENT_VERSION,
    nomeEscola: 'Escola Municipal Exemplo',
    anoLetivo: new Date().getFullYear(),
    diasLetivos: [1, 2, 3, 4, 5], // Seg a Sex
    turnos: [
      {
        id: 'turno-matutino',
        nome: 'Matutino',
        horaInicio: '07:30',
        duracaoAulaMinutos: 50,
        temposCount: 5,
        intervaloAposTempo: 3,
        duracaoIntervaloMinutos: 20,
      },
      {
        id: 'turno-vespertino',
        nome: 'Vespertino',
        horaInicio: '13:00',
        duracaoAulaMinutos: 50,
        temposCount: 5,
        intervaloAposTempo: 3,
        duracaoIntervaloMinutos: 20,
      },
    ],
    turmas: [
      { id: 'turma-6a', nome: '6º Ano A', sigla: '6A', turnoId: 'turno-matutino', corHex: '#3b82f6' },
      { id: 'turma-7a', nome: '7º Ano A', sigla: '7A', turnoId: 'turno-matutino', corHex: '#10b981' },
      { id: 'turma-8a', nome: '8º Ano A', sigla: '8A', turnoId: 'turno-matutino', corHex: '#f59e0b' },
      { id: 'turma-9a', nome: '9º Ano A', sigla: '9A', turnoId: 'turno-matutino', corHex: '#8b5cf6' },
    ],
    professores: [
      { id: 'prof-1', nome: 'Carlos Alberto (Matemática)', sigla: 'CAR', limiteAulasDia: 5, evitarJanelas: true, corHex: '#2563eb' },
      { id: 'prof-2', nome: 'Maria Santos (Português)', sigla: 'MAR', limiteAulasDia: 5, evitarJanelas: true, corHex: '#db2777' },
      { id: 'prof-3', nome: 'João Ferreira (História)', sigla: 'JOA', limiteAulasDia: 4, evitarJanelas: true, corHex: '#d97706' },
      { id: 'prof-4', nome: 'Ana Paula (Ciências)', sigla: 'ANA', limiteAulasDia: 5, evitarJanelas: true, corHex: '#059669' },
      { id: 'prof-5', nome: 'Roberto Lima (Geografia)', sigla: 'ROB', limiteAulasDia: 4, evitarJanelas: true, corHex: '#7c3aed' },
      { id: 'prof-6', nome: 'Juliana Costa (Ed. Física)', sigla: 'JUL', limiteAulasDia: 4, evitarJanelas: true, corHex: '#ea580c' },
    ],
    disponibilidades: [],
    disciplinas: [
      { id: 'disc-mat', nome: 'Matemática', sigla: 'MAT', corHex: '#2563eb' },
      { id: 'disc-por', nome: 'Língua Portuguesa', sigla: 'POR', corHex: '#db2777' },
      { id: 'disc-his', nome: 'História', sigla: 'HIS', corHex: '#d97706' },
      { id: 'disc-cie', nome: 'Ciências', sigla: 'CIE', corHex: '#059669' },
      { id: 'disc-geo', nome: 'Geografia', sigla: 'GEO', corHex: '#7c3aed' },
      { id: 'disc-edf', nome: 'Educação Física', sigla: 'EDF', corHex: '#ea580c' },
    ],
    matrizCurricular: [
      { id: 'matriz-1', turmaId: 'turma-6a', disciplinaId: 'disc-mat', professorId: 'prof-1', aulasSemanais: 5, permiteGeminada: true, maximoAulasDia: 2 },
      { id: 'matriz-2', turmaId: 'turma-6a', disciplinaId: 'disc-por', professorId: 'prof-2', aulasSemanais: 5, permiteGeminada: true, maximoAulasDia: 2 },
      { id: 'matriz-3', turmaId: 'turma-6a', disciplinaId: 'disc-his', professorId: 'prof-3', aulasSemanais: 3, permiteGeminada: false, maximoAulasDia: 1 },
      { id: 'matriz-4', turmaId: 'turma-6a', disciplinaId: 'disc-cie', professorId: 'prof-4', aulasSemanais: 4, permiteGeminada: true, maximoAulasDia: 2 },
      { id: 'matriz-5', turmaId: 'turma-6a', disciplinaId: 'disc-geo', professorId: 'prof-5', aulasSemanais: 3, permiteGeminada: false, maximoAulasDia: 1 },
      { id: 'matriz-6', turmaId: 'turma-6a', disciplinaId: 'disc-edf', professorId: 'prof-6', aulasSemanais: 2, permiteGeminada: true, maximoAulasDia: 2 },

      { id: 'matriz-7', turmaId: 'turma-7a', disciplinaId: 'disc-mat', professorId: 'prof-1', aulasSemanais: 5, permiteGeminada: true, maximoAulasDia: 2 },
      { id: 'matriz-8', turmaId: 'turma-7a', disciplinaId: 'disc-por', professorId: 'prof-2', aulasSemanais: 5, permiteGeminada: true, maximoAulasDia: 2 },
      { id: 'matriz-9', turmaId: 'turma-7a', disciplinaId: 'disc-his', professorId: 'prof-3', aulasSemanais: 3, permiteGeminada: false, maximoAulasDia: 1 },
      { id: 'matriz-10', turmaId: 'turma-7a', disciplinaId: 'disc-cie', professorId: 'prof-4', aulasSemanais: 4, permiteGeminada: true, maximoAulasDia: 2 },
      { id: 'matriz-11', turmaId: 'turma-7a', disciplinaId: 'disc-geo', professorId: 'prof-5', aulasSemanais: 3, permiteGeminada: false, maximoAulasDia: 1 },
      { id: 'matriz-12', turmaId: 'turma-7a', disciplinaId: 'disc-edf', professorId: 'prof-6', aulasSemanais: 2, permiteGeminada: true, maximoAulasDia: 2 },
    ],
    gradeHorario: [],
    ultimaModificacao: new Date().toISOString(),
  };
}
