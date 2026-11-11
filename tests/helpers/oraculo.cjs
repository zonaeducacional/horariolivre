// Oracle written for this homologation; does not import production validators/solver.
exports.validate=function validate(p,grade=p.gradeHorario){
 const errors=[],id=new Set(),slots=new Set(),loads={},days={},teachers={},groups={},occupied=[];
 const classes=Object.fromEntries(p.turmas.map(x=>[x.id,x])),shifts=Object.fromEntries(p.turnos.map(x=>[x.id,x])),profs=Object.fromEntries(p.professores.map(x=>[x.id,x])),matrix=Object.fromEntries(p.matrizCurricular.map(x=>[x.id,x]));
 const availability=new Map(p.disponibilidades.map(d=>[JSON.stringify([d.professorId,d.turnoId||'',d.diaSemana,d.tempoNumero]),d.status]));
 const hm=s=>{const [h,m]=s.split(':').map(Number);return 60*h+m;};
 for(const a of grade){const m=matrix[a.matrizItemId],c=classes[a.turmaId],t=c&&shifts[c.turnoId],prof=profs[a.professorId];if(!m||!c||!t||!prof){errors.push('referência inválida');continue;}if(m.turmaId!==a.turmaId||m.disciplinaId!==a.disciplinaId||m.professorId!==a.professorId)errors.push('matriz divergente');
 if(id.has(a.id))errors.push('ID duplicado');id.add(a.id);const key=JSON.stringify([c.id,a.diaSemana,a.tempoNumero]);if(slots.has(key))errors.push('choque turma');slots.add(key);
 if(!p.diasLetivos.includes(a.diaSemana)||!Number.isInteger(a.tempoNumero)||a.tempoNumero<1||a.tempoNumero>t.temposCount)errors.push('slot fora do turno');
 const start=hm(t.horaInicio)+(a.tempoNumero-1)*t.duracaoAulaMinutos+(t.intervaloAposTempo>0&&a.tempoNumero>t.intervaloAposTempo?t.duracaoIntervaloMinutos:0),end=start+t.duracaoAulaMinutos;
 const status=availability.get(JSON.stringify([prof.id,t.id,a.diaSemana,a.tempoNumero]))??availability.get(JSON.stringify([prof.id,'',a.diaSemana,a.tempoNumero]))??1;if(status===0)errors.push('indisponibilidade');
 loads[m.id]=(loads[m.id]||0)+1;const md=JSON.stringify([m.id,a.diaSemana]);days[md]=(days[md]||0)+1;if(days[md]>m.maximoAulasDia)errors.push('máximo disciplina/dia');const pd=JSON.stringify([prof.id,a.diaSemana]);teachers[pd]=(teachers[pd]||0)+1;if(teachers[pd]>prof.limiteAulasDia)errors.push('limite docente/dia');
 const group=JSON.stringify([c.id,a.disciplinaId,a.diaSemana]);(groups[group]??=[]).push({a,m,start,end});const room=(c.salaPadrao||'').trim().toLowerCase();for(const b of occupied)if(b.day===a.diaSemana&&start<b.end&&end>b.start){if(b.prof===prof.id)errors.push('choque professor');if(room&&room===b.room&&c.id!==b.classe)errors.push('choque sala');}occupied.push({day:a.diaSemana,start,end,prof:prof.id,room,classe:c.id});
 }
 for(const m of p.matrizCurricular)if((loads[m.id]||0)!==m.aulasSemanais)errors.push(`carga ${m.id}: ${loads[m.id]||0}/${m.aulasSemanais}`);
 for(const group of Object.values(groups))if(group.length>1){if(group.some(x=>!x.m.permiteGeminada))errors.push('avulsas no mesmo dia');group.sort((a,b)=>a.start-b.start);for(let i=1;i<group.length;i++)if(group[i].start!==group[i-1].end)errors.push('geminação dispersa/recreio');}
 for(const fixed of p.gradeHorario.filter(a=>a.fixaManual)){const actual=grade.find(a=>a.id===fixed.id);if(!actual||JSON.stringify(actual)!==JSON.stringify(fixed))errors.push('fixação alterada');}
 return {valid:!errors.length,aulas:grade.length,esperadas:p.matrizCurricular.reduce((s,m)=>s+m.aulasSemanais,0),errors:[...new Set(errors)]};
};
