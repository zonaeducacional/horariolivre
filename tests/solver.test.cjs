const {test}=require('node:test');const assert=require('node:assert/strict');
const {project,lesson}=require('./fixtures.cjs');const {TimetableCspSolver}=require('../dist-electron/solver/cspSolver.js');
const solve=p=>new TimetableCspSolver(p).solve();
test('avulsas respeitam máximo de uma por dia',()=>{const r=solve(project(3));assert.equal(r.sucesso,true);assert.equal(new Set(r.grade.map(a=>a.diaSemana)).size,3);});
test('capacidade considera seis tempos',()=>{const p=project(1);p.diasLetivos=[1];p.turnos[0].temposCount=6;p.matrizCurricular=Array.from({length:6},(_,i)=>({...p.matrizCurricular[0],id:'m'+i,disciplinaId:'d'+i}));p.disciplinas=p.matrizCurricular.map(m=>({id:m.disciplinaId,nome:m.id,sigla:m.id,corHex:'#123456'}));assert.equal(solve(p).sucesso,true);});
test('referência inexistente nunca é solução válida',()=>{const p=project(1);p.professores=[];assert.equal(solve(p).sucesso,false);});
test('preserva aula fixa na regeração',()=>{const p=project(1);p.gradeHorario=[lesson({diaSemana:5,tempoNumero:5,fixaManual:true})];const r=solve(p);assert.equal(r.sucesso,true);assert.equal(r.grade[0].diaSemana,5);assert.equal(r.grade[0].tempoNumero,5);assert.equal(r.grade[0].fixaManual,true);});
test('preferência pode orientar sem ser obrigatória',()=>{const p=project(1);p.disponibilidades=[{professorId:'p',diaSemana:5,tempoNumero:5,status:2}];const r=solve(p);assert.equal(r.sucesso,true);assert.equal(r.grade[0].diaSemana,5);assert.equal(r.grade[0].tempoNumero,5);});
