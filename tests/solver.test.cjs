const {test}=require('node:test');const assert=require('node:assert/strict');
const {project,lesson}=require('./fixtures.cjs');const {TimetableCspSolver}=require('../dist-electron/solver/cspSolver.js');
const solve=p=>new TimetableCspSolver(p).solve();
test('avulsas respeitam máximo de uma por dia',()=>{const r=solve(project(3));assert.equal(r.sucesso,true);assert.equal(new Set(r.grade.map(a=>a.diaSemana)).size,3);});
test('capacidade considera seis tempos',()=>{const p=project(1);p.diasLetivos=[1];p.turnos[0].temposCount=6;p.matrizCurricular=Array.from({length:6},(_,i)=>({...p.matrizCurricular[0],id:'m'+i,disciplinaId:'d'+i}));p.disciplinas=p.matrizCurricular.map(m=>({id:m.disciplinaId,nome:m.id,sigla:m.id,corHex:'#123456'}));assert.equal(solve(p).sucesso,true);});
test('referência inexistente nunca é solução válida',()=>{const p=project(1);p.professores=[];assert.equal(solve(p).sucesso,false);});
test('preserva aula fixa na regeração',()=>{const p=project(1);p.gradeHorario=[lesson({diaSemana:5,tempoNumero:5,fixaManual:true})];const r=solve(p);assert.equal(r.sucesso,true);assert.equal(r.grade[0].diaSemana,5);assert.equal(r.grade[0].tempoNumero,5);assert.equal(r.grade[0].fixaManual,true);});
test('preferência pode orientar sem ser obrigatória',()=>{const p=project(1);p.disponibilidades=[{professorId:'p',diaSemana:5,tempoNumero:5,status:2}];const r=solve(p);assert.equal(r.sucesso,true);assert.equal(r.grade[0].diaSemana,5);assert.equal(r.grade[0].tempoNumero,5);});

function sharedRoomProject() {
 const p=project(3);p.diasLetivos=[1,2,3];p.turnos[0].temposCount=1;p.turnos[0].intervaloAposTempo=1;
 p.turmas[0].salaPadrao=' 02 ';p.turmas.push({...p.turmas[0],id:'c2',nome:'Outra turma',salaPadrao:'02'});
 p.professores.push({...p.professores[0],id:'p2'});
 p.matrizCurricular.push({...p.matrizCurricular[0],id:'m2',turmaId:'c2',professorId:'p2'});
 return p;
}
test('explica excesso de carga em sala compartilhada no mesmo turno',()=>{
 const r=solve(sharedRoomProject());assert.equal(r.status,'impossivel');
 assert.match(r.mensagem,/capacidade de uma sala/);assert.match(r.conflitos[0],/Sala 02.*6 aulas para 3/);assert.match(r.conflitos[0],/Outra turma/);
});
test('permite reutilizar a sala em turnos separados',()=>{
 const p=sharedRoomProject();p.turnos.push({...p.turnos[0],id:'t2',nome:'Tarde',horaInicio:'13:00'});p.turmas[1].turnoId='t2';
 assert.equal(solve(p).sucesso,true);
});
test('permite compartilhar sala quando as cargas cabem no turno',()=>{
 const p=sharedRoomProject();p.matrizCurricular[0].aulasSemanais=1;p.matrizCurricular[1].aulasSemanais=2;
 assert.equal(solve(p).sucesso,true);
});
test('reserva orçamento para aulas simples sem declarar impossibilidade ao interromper a primeira fase',()=>{
 const p=project(3);const progress=[];
 const solver=new TimetableCspSolver(p,event=>progress.push(event),{maxIterations:8});
 const r=solver.solve();assert.equal(r.status,'sucesso');assert.equal(r.grade.length,3);
 assert.equal(progress.at(-1).progressoPorcento,100);
});
