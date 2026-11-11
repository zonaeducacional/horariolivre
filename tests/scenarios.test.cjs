const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {TimetableCspSolver}=require('../dist-electron/solver/cspSolver.js');
const {SolverRunner}=require('../dist-electron/main/solverRunner.js');
const {validate}=require('./helpers/oraculo.cjs');
for(const [size,classes,teachers,lessons] of [['pequena',5,10,125],['media',12,25,300],['grande',24,45,600]])test(`cenário homologado ${size}: solução independente em 30s`,{timeout:35000},async()=>{
 const p=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/homologacao',size+'.json')));
 assert.equal(p.turmas.length,classes);assert.equal(p.professores.length,teachers);assert.equal(p.gradeHorario.length,0);
 const snapshot=JSON.stringify(p),r=await new SolverRunner().run(p);
 assert.equal(r.status,'sucesso',r.mensagem);assert.equal(r.grade.length,lessons);assert.ok(r.tempoGastoMs<30000);
 assert.deepEqual(validate(p,r.grade).errors,[]);assert.equal(JSON.stringify(p),snapshot);
});
test('busca não depende dos nomes, IDs ou ordem do cenário',()=>{
 const p=structuredClone(require('./fixtures/homologacao/pequena.json'));
 const ids=new Map([...p.turmas,...p.professores,...p.disciplinas,...p.turnos,...p.matrizCurricular].map((v,i)=>[v.id,'anon-'+i]));
 for(const list of [p.turmas,p.professores,p.disciplinas,p.turnos,p.matrizCurricular,p.disponibilidades])for(const value of list)for(const key of ['id','turnoId','turmaId','professorId','disciplinaId'])if(value[key])value[key]=ids.get(value[key]);
 p.matrizCurricular.reverse();p.turmas.reverse();
 const s=new TimetableCspSolver(p),r=s.solve();assert.equal(r.sucesso,true,r.mensagem);assert.equal(validate(p,r.grade).valid,true);
 assert.ok(s.diagnostics.nodes>0);assert.ok(s.diagnostics.domains>0);
});
test('poda de cobertura concorda com enumeração exaustiva em 256 disponibilidades',()=>{
 const base=require('./fixtures.cjs').project();base.diasLetivos=[1,2];base.turnos[0].temposCount=2;base.turnos[0].intervaloAposTempo=0;
 base.professores=['p','q'].map(id=>({id,nome:id,sigla:id,limiteAulasDia:2,evitarJanelas:false}));
 base.disciplinas=[{id:'a',nome:'A',sigla:'A',corHex:'#2563eb'},{id:'b',nome:'B',sigla:'B',corHex:'#2563eb'}];
 base.turmas=['x','y'].map(id=>({id,nome:id,sigla:id,turnoId:'t'}));
 base.matrizCurricular=base.turmas.flatMap(c=>base.disciplinas.map((d,i)=>({id:c.id+d.id,turmaId:c.id,disciplinaId:d.id,professorId:i?'q':'p',aulasSemanais:2,maximoAulasDia:1,permiteGeminada:false})));
 const complete=[];
 for(let order=0;order<16;order++){
  const grade=[];
  for(let c=0;c<2;c++)for(let day=1;day<=2;day++)for(let time=1;time<=2;time++){
   const swapped=(order>>(c*2+day-1))&1,m=base.matrizCurricular[c*2+((time-1)^swapped)];
   grade.push({id:`${c}-${day}-${time}`,matrizItemId:m.id,turmaId:m.turmaId,professorId:m.professorId,disciplinaId:m.disciplinaId,diaSemana:day,tempoNumero:time,fixaManual:false});
  }complete.push(grade);
 }
 for(let mask=0;mask<256;mask++){
  const p=structuredClone(base);p.disponibilidades=[];
  for(let teacher=0;teacher<2;teacher++)for(let day=1;day<=2;day++)for(let time=1;time<=2;time++)if(mask&(1<<(teacher*4+(day-1)*2+time-1)))p.disponibilidades.push({professorId:teacher?'q':'p',diaSemana:day,tempoNumero:time,status:0});
  const possible=complete.some(grade=>validate(p,grade).valid),r=new TimetableCspSolver(p).solve();
  assert.equal(r.status,possible?'sucesso':'impossivel',`máscara ${mask}: ${r.mensagem}`);
  if(r.sucesso)assert.equal(validate(p,r.grade).valid,true);
 }
});
