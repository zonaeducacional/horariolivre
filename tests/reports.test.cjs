const {test}=require('node:test');const assert=require('node:assert/strict');const {project,lesson}=require('./fixtures.cjs');const {tabelasProfessor,nomeAbaExcel}=require('../dist-electron/shared/reports.js');const {criarWorkbook}=require('../dist-electron/main/excel.js');const {criarPdfProfessores}=require('../dist-electron/shared/pdfReports.js');
function p(){const p=project(1);p.turnos.push({...p.turnos[0],id:'t2',nome:'Tarde',horaInicio:'13:00',temposCount:7});p.turmas.push({id:'c2',nome:'Outra',sigla:'T',turnoId:'t2'});p.matrizCurricular.push({...p.matrizCurricular[0],id:'m2',turmaId:'c2'});p.gradeHorario=[lesson(),lesson({id:'b',matrizItemId:'m2',turmaId:'c2',tempoNumero:7})];return p;}
test('relatório docente inclui dois turnos e sétimo tempo',()=>{const tables=tabelasProfessor(p(),'p');assert.equal(tables.length,2);assert.equal(tables[1].rows.length,7);assert.match(tables[1].rows[6][1],/T - D/);assert.match(tables[1].rows[6][0],/18:20/);});
test('normaliza nomes inválidos, longos, repetidos e reservados',()=>{const used=[];for(const s of ['A/B','A/B','X'.repeat(50),'history']){const n=nomeAbaExcel(s,used);assert.ok(n.length<=31);assert.doesNotMatch(n,/[:\\/?*\[\]]/);assert.ok(!used.includes(n));used.push(n);}});
test('Excel exportado faz roundtrip sem omitir turno docente',()=>{const X=require('xlsx'),wb=criarWorkbook(p());assert.equal(new Set(wb.SheetNames).size,wb.SheetNames.length);const buffer=X.write(wb,{bookType:'xlsx',type:'buffer'});const read=X.read(buffer);assert.equal(read.SheetNames.length,5);const prof=read.Sheets[read.SheetNames.find(n=>n.startsWith('Prof'))];assert.match(JSON.stringify(X.utils.sheet_to_json(prof,{header:1})),/18:20/);});
test('PDF gera documento com turnos completos e sem gravar arquivo',()=>{const doc=criarPdfProfessores(p());const text=doc.output();assert.ok(text.startsWith('%PDF-'));assert.match(text,/Tarde/);assert.match(text,/Manh/);assert.ok(doc.getNumberOfPages()>=1);});
test('relatórios rejeitam carga incompleta',()=>{const p=project(2);p.gradeHorario=[lesson()];assert.throws(()=>criarWorkbook(p),/Carga/);assert.throws(()=>criarPdfProfessores(p),/Carga/);});
function mural(n=24,sigla='POR'){
 const q=project(1);q.turnos.push({...q.turnos[0],id:'t2',nome:'Tarde',horaInicio:'13:00'});
 q.turmas=[];q.professores=[];q.matrizCurricular=[];q.gradeHorario=[];q.disciplinas[0].sigla=sigla;
 for(let i=0;i<n;i++){
  q.turmas.push({id:'c'+i,nome:'Turma '+i,sigla:'T'+i,turnoId:i<n/2?'t':'t2'});
  q.professores.push({id:'p'+i,nome:'Docente '+i,sigla:'D'+String(i+1).padStart(2,'0'),limiteAulasDia:5,evitarJanelas:false});
  q.matrizCurricular.push({id:'m'+i,turmaId:'c'+i,professorId:'p'+i,disciplinaId:'d',aulasSemanais:1,maximoAulasDia:1,permiteGeminada:false});
  q.gradeHorario.push(lesson({id:'a'+i,turmaId:'c'+i,professorId:'p'+i,matrizItemId:'m'+i}));
 }return q;
}
test('quadro geral: 24 turmas, duas páginas e siglas inteiras a 8pt',()=>{
 const {criarPdfQuadroGeral}=require('../dist-electron/shared/pdfReports.js');const doc=criarPdfQuadroGeral(mural());
 assert.equal(doc.getNumberOfPages(),2);const content=doc.output();assert.equal((content.match(/\(POR\) Tj/g)||[]).length,24);
 for(let i=1;i<=24;i++)assert.ok(content.includes('(D'+String(i).padStart(2,'0')+') Tj'));
 assert.match(content,/8 Tf/);
});
test('quadro geral repete identificação nas continuações verticais',()=>{
 const {criarPdfQuadroGeral}=require('../dist-electron/shared/pdfReports.js');const doc=criarPdfQuadroGeral(mural(100));
 assert.ok(doc.getNumberOfPages()>2);for(const page of doc.internal.pages.slice(1))assert.match(page.join('\n'),/Quadro geral -/);
});
test('sigla longa cria painéis sem partir identificadores nem reduzir fonte',()=>{
 const {criarPdfQuadroGeral}=require('../dist-electron/shared/pdfReports.js');const doc=criarPdfQuadroGeral(mural(24,'COMPONENTE'));
 assert.ok(doc.getNumberOfPages()>2);assert.equal((doc.output().match(/\(COMPONENTE\) Tj/g)||[]).length,24);assert.match(doc.output(),/Painel/);
});
test('quadro geral também rejeita grade incompleta',()=>{
 const {criarPdfQuadroGeral}=require('../dist-electron/shared/pdfReports.js');assert.throws(()=>criarPdfQuadroGeral(project(2)),/Carga/);
});
