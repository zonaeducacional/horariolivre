export interface Turno {
  id: string;
  nome: string; // ex: "Matutino", "Vespertino"
  horaInicio: string; // ex: "07:00"
  duracaoAulaMinutos: number; // ex: 50
  temposCount: number; // ex: 5
  intervaloAposTempo: number; // ex: 3 (intervalo após o 3º tempo)
  duracaoIntervaloMinutos: number; // ex: 20
}

export interface TempoAula {
  id: string;
  turnoId: string;
  numero: number; // 1, 2, 3, 4, 5
  horaInicio: string; // "07:00"
  horaFim: string; // "07:50"
  isIntervalo?: boolean;
}

export interface Turma {
  id: string;
  nome: string; // "6º Ano A"
  sigla: string; // "6A"
  turnoId: string;
  salaPadrao?: string;
  corHex?: string;
}

export interface Professor {
  id: string;
  nome: string;
  sigla: string; // "CAR"
  email?: string;
  telefone?: string;
  limiteAulasDia: number; // ex: 5
  evitarJanelas: boolean; // default true
  corHex?: string;
}

// 0 = Indisponível (Vermelho), 1 = Disponível (Verde), 2 = Preferência (Amarelo)
export type DisponibilidadeStatus = 0 | 1 | 2;

export interface DisponibilidadeProfessor {
  turnoId?: string; // ausente em arquivos antigos: aplica-se a todos os turnos
  professorId: string;
  diaSemana: number; // 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
  tempoNumero: number; // 1 a 6
  status: DisponibilidadeStatus;
}

export interface Disciplina {
  id: string;
  nome: string; // "Matemática"
  sigla: string; // "MAT"
  corHex: string; // ex: "#2563eb"
}

export interface MatrizCurricularItem {
  id: string;
  turmaId: string;
  disciplinaId: string;
  professorId: string;
  aulasSemanais: number; // ex: 4
  permiteGeminada: boolean; // ex: true (blocos de 2)
  maximoAulasDia: number; // ex: 2
}

export interface AulaAgendada {
  id: string;
  matrizItemId: string;
  turmaId: string;
  disciplinaId: string;
  professorId: string;
  diaSemana: number; // 1 a 6
  tempoNumero: number; // 1 a 6
  fixaManual: boolean; // Se o usuário fixou manualmente
}

export interface ProjetoHorario {
  versao: string;
  nomeEscola: string;
  anoLetivo: number;
  diasLetivos: number[]; // [1, 2, 3, 4, 5] (Segunda a Sexta)
  turnos: Turno[];
  turmas: Turma[];
  professores: Professor[];
  disponibilidades: DisponibilidadeProfessor[];
  disciplinas: Disciplina[];
  matrizCurricular: MatrizCurricularItem[];
  gradeHorario: AulaAgendada[];
  ultimaModificacao: string;
  gradeDesatualizada?: boolean;
}

export interface SolverProgress {
  progressoPorcento: number;
  etapa: string;
  aulasAlocadas: number;
  totalAulas: number;
  conflitosRestantes: number;
}

export interface SolverResult {
  status?: 'sucesso' | 'impossivel' | 'limite' | 'cancelado' | 'erro';
  sucesso: boolean;
  grade: AulaAgendada[];
  mensagem: string;
  conflitos?: string[];
  tempoGastoMs: number;
}
