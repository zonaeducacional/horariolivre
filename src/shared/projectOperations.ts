import { ProjetoHorario } from './types';

/** Cascades only explicit entity removals. Other edits retain the timetable and mark it stale. */
export function aplicarAlteracao(anterior: ProjetoHorario, proximo: ProjetoHorario): ProjetoHorario {
  const turmas = new Set(proximo.turmas.map(t=>t.id));
  const turnos = new Set(proximo.turnos.map(t=>t.id));
  if (proximo.turmas.some(t=>!turnos.has(t.turnoId))) throw new Error('Este turno possui turmas vinculadas. Reatribua as turmas antes de excluí-lo.');
  const profs = new Set(proximo.professores.map(p=>p.id)), discs = new Set(proximo.disciplinas.map(d=>d.id));
  const matrizCurricular = proximo.matrizCurricular.filter(m=>turmas.has(m.turmaId)&&profs.has(m.professorId)&&discs.has(m.disciplinaId));
  const ids = new Set(matrizCurricular.map(m=>m.id));
  const disponibilidades = proximo.disponibilidades.filter(d=>profs.has(d.professorId)&&(!d.turnoId||turnos.has(d.turnoId)));
  const gradeHorario = proximo.gradeHorario.filter(a=>ids.has(a.matrizItemId)&&turmas.has(a.turmaId)&&profs.has(a.professorId)&&discs.has(a.disciplinaId));
  const regras = (p:ProjetoHorario)=>JSON.stringify([p.diasLetivos,p.turnos,p.turmas,p.professores,p.disciplinas,p.matrizCurricular,p.disponibilidades]);
  return {...proximo,matrizCurricular,disponibilidades,gradeHorario,gradeDesatualizada:proximo.gradeDesatualizada||regras(anterior)!==regras(proximo)};
}
