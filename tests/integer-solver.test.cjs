const {test}=require('node:test');
const assert=require('node:assert/strict');
const {solveTimetable}=require('../dist-electron/solver/integerSolver.js');
const {SolverRunner}=require('../dist-electron/main/solverRunner.js');
const {project,lesson}=require('./fixtures.cjs');
const {validate}=require('./helpers/oraculo.cjs');
const restricted=()=>structuredClone(require('./fixtures/homologacao/dias-restritos.json'));

test('worker gera do zero 200 aulas com docentes em dois turnos e dias restritos',async()=>{
 const p=restricted(),snapshot=JSON.stringify(p),events=[];
 assert.equal(p.professores.length,13);assert.equal(p.gradeHorario.length,0);
 const r=await new SolverRunner().run(p,e=>events.push(e));
 assert.equal(r.status,'sucesso',r.mensagem);assert.equal(r.grade.length,200);assert.ok(r.tempoGastoMs<30000);
 assert.deepEqual(validate(p,r.grade).errors,[]);assert.equal(JSON.stringify(p),snapshot);
 for(const [teacher,total,blocked] of [['teacher1',26,[5]],['teacher5',16,[1,2,3]],['teacher10',25,[]]]){
  const lessons=r.grade.filter(a=>a.professorId===teacher);assert.equal(lessons.length,total);
  assert.equal(lessons.some(a=>blocked.includes(a.diaSemana)),false);
 }
 assert.equal(events.at(-1).progressoPorcento,100);assert.ok(events.slice(0,-1).every(e=>e.progressoPorcento<=95));
});
test('dias restritos permanecem válidos com IDs e ordem diferentes',async()=>{
 const p=restricted();const ids=new Map([...p.turnos,...p.turmas,...p.professores,...p.disciplinas,...p.matrizCurricular].map((v,i)=>[v.id,'alterado-'+i]));
 for(const list of [p.turnos,p.turmas,p.professores,p.disciplinas,p.matrizCurricular,p.disponibilidades])for(const row of list)for(const key of ['id','turnoId','turmaId','professorId','disciplinaId'])if(row[key])row[key]=ids.get(row[key]);
 p.turmas.reverse();p.professores.reverse();p.matrizCurricular.reverse();
 const r=await solveTimetable(p);assert.equal(r.status,'sucesso',r.mensagem);assert.deepEqual(validate(p,r.grade).errors,[]);
});
test('novos limites e cancelamento nunca aceitam grade parcial',async()=>{
 for(const options of [{maxIterations:0},{maxTimeMs:0}]){
  const r=await solveTimetable(project(),undefined,options);assert.equal(r.status,'limite');assert.deepEqual(r.grade,[]);
 }
 const flag=new Int32Array(new SharedArrayBuffer(4));
 const r=await solveTimetable(restricted(),e=>{if(e.progressoPorcento===20)Atomics.store(flag,0,1);},{cancelFlag:flag});
 assert.equal(r.status,'cancelado');assert.deepEqual(r.grade,[]);
});
test('aulas fixas são preservadas com todos os campos e IDs',async()=>{
 const p=project(2);p.gradeHorario=[lesson({id:'fixa-original',diaSemana:5,tempoNumero:5,fixaManual:true})];
 const r=await solveTimetable(p);assert.equal(r.status,'sucesso');assert.deepEqual(r.grade.find(a=>a.id==='fixa-original'),p.gradeHorario[0]);assert.deepEqual(validate(p,r.grade).errors,[]);
});
test('fixação fora do dia de trabalho é explicada antes da busca',async()=>{
 const p=project(1);p.gradeHorario=[lesson({fixaManual:true})];p.disponibilidades=[{professorId:'p',turnoId:'t',diaSemana:1,tempoNumero:1,status:0}];
 const r=await solveTimetable(p);assert.equal(r.status,'impossivel');assert.ok(r.conflitos.some(s=>/indisponível/.test(s)));
});
test('modelo aceita continuidade completada por atribuições distintas',async()=>{
 const p=project(1);p.diasLetivos=[1];p.turnos[0].temposCount=2;p.turnos[0].intervaloAposTempo=0;
 p.matrizCurricular[0].permiteGeminada=true;p.matrizCurricular.push({...p.matrizCurricular[0],id:'m2'});
 const r=await solveTimetable(p);assert.equal(r.status,'sucesso',r.mensagem);assert.deepEqual(validate(p,r.grade).errors,[]);
 p.matrizCurricular[0].permiteGeminada=false;assert.equal((await solveTimetable(p)).status,'impossivel');
});
test('modelo distingue sobreposição real e horários separados em turnos diferentes',async()=>{
 const p=project(1);p.diasLetivos=[1];p.turnos[0].temposCount=1;p.turnos[0].intervaloAposTempo=0;
 p.turnos.push({...p.turnos[0],id:'t2',horaInicio:'07:25'});p.turmas.push({...p.turmas[0],id:'c2',turnoId:'t2'});p.matrizCurricular.push({...p.matrizCurricular[0],id:'m2',turmaId:'c2'});
 assert.equal((await solveTimetable(p)).status,'impossivel');
 p.turnos[1].horaInicio='13:00';const r=await solveTimetable(p);assert.equal(r.status,'sucesso');assert.deepEqual(validate(p,r.grade).errors,[]);
});
test('modelo respeita disponibilidade por turno e limite diário somando turnos',async()=>{
 const p=project(1);p.diasLetivos=[1,2];p.turnos[0].temposCount=1;p.turnos[0].intervaloAposTempo=0;
 p.turnos.push({...p.turnos[0],id:'t2',horaInicio:'13:00'});p.turmas.push({...p.turmas[0],id:'c2',turnoId:'t2'});p.matrizCurricular.push({...p.matrizCurricular[0],id:'m2',turmaId:'c2'});
 p.disponibilidades=[{professorId:'p',turnoId:'t',diaSemana:1,tempoNumero:1,status:0},{professorId:'p',turnoId:'t2',diaSemana:2,tempoNumero:1,status:0}];p.professores[0].limiteAulasDia=1;
 const r=await solveTimetable(p);assert.equal(r.status,'sucesso');assert.deepEqual(validate(p,r.grade).errors,[]);
 assert.equal(r.grade.find(a=>a.turmaId==='c').diaSemana,2);assert.equal(r.grade.find(a=>a.turmaId==='c2').diaSemana,1);
});
test('modelo não permite geminação através do intervalo',async()=>{
 const p=project(2);p.diasLetivos=[1];p.turnos[0].temposCount=2;p.turnos[0].intervaloAposTempo=1;p.matrizCurricular[0].permiteGeminada=true;p.matrizCurricular[0].maximoAulasDia=2;
 assert.equal((await solveTimetable(p)).status,'impossivel');p.turnos[0].duracaoIntervaloMinutos=0;
 assert.equal((await solveTimetable(p)).status,'sucesso');
});
test('modelo concorda com enumeração independente em 256 disponibilidades',async()=>{
 const p=project(2);p.diasLetivos=[1,2];p.turnos[0].temposCount=2;p.turnos[0].intervaloAposTempo=0;
 p.professores=['p','q'].map(id=>({id,nome:id,sigla:id,limiteAulasDia:2,evitarJanelas:false}));
 p.disciplinas=['a','b'].map(id=>({id,nome:id,sigla:id,corHex:'#123456'}));p.turmas=['x','y'].map(id=>({id,nome:id,sigla:id,turnoId:'t'}));
 p.matrizCurricular=p.turmas.flatMap(c=>p.disciplinas.map((d,i)=>({id:c.id+d.id,turmaId:c.id,disciplinaId:d.id,professorId:i?'q':'p',aulasSemanais:2,maximoAulasDia:1,permiteGeminada:false})));
 const possibilities=[];
 for(let order=0;order<16;order++){
  const grade=[];for(let c=0;c<2;c++)for(let d=1;d<=2;d++)for(let t=1;t<=2;t++){
   const m=p.matrizCurricular[c*2+((t-1)^((order>>(c*2+d-1))&1))];grade.push({...lesson(),id:`${c}-${d}-${t}`,matrizItemId:m.id,turmaId:m.turmaId,disciplinaId:m.disciplinaId,professorId:m.professorId,diaSemana:d,tempoNumero:t});
  }possibilities.push(grade);
 }
 for(let mask=0;mask<256;mask++){
  p.disponibilidades=[];for(let teacher=0;teacher<2;teacher++)for(let d=1;d<=2;d++)for(let t=1;t<=2;t++)if(mask&(1<<(teacher*4+(d-1)*2+t-1)))p.disponibilidades.push({professorId:teacher?'q':'p',diaSemana:d,tempoNumero:t,status:0});
  const possible=possibilities.some(g=>validate(p,g).valid),r=await solveTimetable(p);
  assert.equal(r.status,possible?'sucesso':'impossivel',`máscara ${mask}: ${r.mensagem}`);if(r.sucesso)assert.deepEqual(validate(p,r.grade).errors,[]);
 }
});

test('blocos contíguos concordam com enumeração independente de disponibilidades e intervalos',async()=>{
 for(const intervalo of [0,2])for(let unavailable=0;unavailable<32;unavailable++)for(let count=1;count<=5;count++){
  const p=project(count);p.diasLetivos=[1];p.turnos[0].intervaloAposTempo=intervalo;
  p.matrizCurricular[0].permiteGeminada=true;p.matrizCurricular[0].maximoAulasDia=5;
  for(let time=1;time<=5;time++)if(unavailable&(1<<(time-1)))p.disponibilidades.push({professorId:'p',diaSemana:1,tempoNumero:time,status:0});
  let possible=false;
  for(let selected=0;selected<32;selected++){
   const grade=[];for(let time=1;time<=5;time++)if(selected&(1<<(time-1)))grade.push(lesson({id:'enum-'+time,tempoNumero:time}));
   if(grade.length===count&&validate(p,grade).valid){possible=true;break;}
  }
  const r=await solveTimetable(p);
  assert.equal(r.status,possible?'sucesso':'impossivel',JSON.stringify({intervalo,unavailable,count,mensagem:r.mensagem}));
  if(r.sucesso)assert.deepEqual(validate(p,r.grade).errors,[]);
 }
});
