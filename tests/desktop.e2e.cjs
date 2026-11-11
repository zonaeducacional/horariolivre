const {test,before,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {_electron}=require('playwright');
let app,page,dir;const errors=[];
function launchOptions(env){const args=['--headless','--ozone-platform=headless','--user-data-dir='+path.join(dir,'profile')];return process.env.VIBELAB_E2E_EXECUTABLE?{executablePath:path.resolve(process.env.VIBELAB_E2E_EXECUTABLE),args,env,timeout:20000}:{args:[path.resolve('.'),...args],env,timeout:20000};}
before(async()=>{
 dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibelab-desktop-'));
 const env={...process.env,XDG_CONFIG_HOME:dir,XDG_CACHE_HOME:dir};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch(launchOptions(env));
 page=await app.firstWindow();await page.context().setOffline(true);page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.getByText('Turnos e Tempos de Aula',{exact:true}).waitFor();
});
after(async()=>{if(page&&!page.isClosed()){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].destroy());}await app?.close();if(dir&&fs.existsSync(dir))fs.rmSync(dir,{recursive:true});});
test('desktop carrega com sandbox, isolamento e ponte mínima',async()=>{
 const prefs=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());assert.equal(prefs.sandbox,true);assert.equal(prefs.contextIsolation,true);assert.equal(prefs.nodeIntegration,false);assert.equal(await app.evaluate(({app})=>app.commandLine.hasSwitch('no-sandbox')),false);
 assert.equal(await page.evaluate(()=>typeof window.require),'undefined');assert.equal(await page.evaluate(()=>typeof window.api.executarSolver),'function');assert.equal(await page.title(),'Vibe Lab Horário');
});
test('gera horário real pelo IPC e worker',async()=>{
 await page.getByRole('button',{name:'Gerar Horário (Cálculo)',exact:true}).click();await page.getByRole('button',{name:'Gerar Horário Escolar',exact:true}).click();await page.getByText('Grade Gerada com Sucesso!',{exact:true}).waitFor({timeout:35000});
 assert.match(await page.locator('body').innerText(),/44 aulas/);
});
test('salva projeto pelo diálogo e Ctrl+S cria backup',async()=>{
 const file=path.join(dir,'school.grade');await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},file);
 await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.getByText(/Projeto salvo\./).waitFor();assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).gradeHorario.length,44);
 await page.getByPlaceholder('Nome da Escola').fill('Escola alterada no teste');await page.keyboard.press('Control+s');
 await page.waitForFunction(()=>!document.body.innerText.includes('Alterações não salvas'));assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).nomeEscola,'Escola alterada no teste');assert.ok(fs.existsSync(file+'.bak'));
});
test('relatórios carregam sob CSP e exportam PDF e Excel pelo desktop',async()=>{
 await page.getByRole('button',{name:'Relatórios e Impressão',exact:true}).click();
 const pdf=path.join(dir,'docentes.pdf');
 await app.evaluate(({BrowserWindow},file)=>{globalThis.pendingPdf=new Promise(resolve=>BrowserWindow.getAllWindows()[0].webContents.session.once('will-download',(_event,item)=>{item.setSavePath(file);item.once('done',(_e,state)=>resolve(state));}));},pdf);
 await page.getByRole('button',{name:'Baixar Horário dos Docentes',exact:true}).click();assert.equal(await app.evaluate(()=>globalThis.pendingPdf),'completed');assert.ok(fs.readFileSync(pdf,'latin1').startsWith('%PDF-'));
 const excel=path.join(dir,'grade.xlsx');await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},excel);
 await page.getByRole('button',{name:'Exportar para Excel (.xlsx)',exact:true}).click();await page.getByText(/Planilha Excel exportada com sucesso/).waitFor();assert.ok(require('xlsx').readFile(excel).SheetNames.some(n=>n.startsWith('Prof')));assert.deepEqual(errors,[]);
});
test('arquivo corrompido não substitui projeto aberto',async()=>{
 const file=path.join(dir,'corrompido.grade');fs.writeFileSync(file,'{"incompleto":');await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
 await page.getByRole('button',{name:'Abrir...',exact:true}).click();await page.getByText(/Arquivo JSON corrompido/).waitFor();assert.equal(await page.getByPlaceholder('Nome da Escola').inputValue(),'Escola alterada no teste');assert.equal(fs.readFileSync(file,'utf8'),'{"incompleto":');
});
test('IPC rejeita destino arbitrário sem escrever',async()=>{
 const p=JSON.parse(fs.readFileSync(path.join(dir,'school.grade'),'utf8')),target=path.join(dir,'nao-autorizado.json');const result=await page.evaluate(async({p,target})=>window.api.salvarProjeto(target,p),{p,target});assert.equal(result.sucesso,false);assert.match(result.erro,/não autorizado/);assert.equal(fs.existsSync(target),false);
});
test('saída com alterações exige decisão e cancelar mantém janela',async()=>{
 await page.getByPlaceholder('Nome da Escola').fill('Trabalho não salvo');await page.getByRole('status').filter({hasText:'Alterações não salvas'}).waitFor();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await page.getByRole('dialog',{name:'Alterações não salvas'}).waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await page.getByPlaceholder('Nome da Escola').inputValue(),'Trabalho não salvo');assert.equal(page.isClosed(),false);
});
test('backup de recuperação é gravado sem modificar arquivo salvo',async()=>{
 const recoveryPath=path.join(await app.evaluate(({app})=>app.getPath('userData')),'recovery-v1.grade');
 await page.waitForTimeout(700);assert.equal(JSON.parse(fs.readFileSync(recoveryPath,'utf8')).nomeEscola,'Trabalho não salvo');assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'school.grade'),'utf8')).nomeEscola,'Escola alterada no teste');
});
test('interface permanece sem exceções de renderer',async()=>{assert.deepEqual(errors,[]);});
test('reabertura oferece recuperação e preserva arquivo original',async()=>{
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].destroy());await app.close();
 const env={...process.env,XDG_CONFIG_HOME:dir,XDG_CACHE_HOME:dir};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch(launchOptions(env));page=await app.firstWindow();await page.context().setOffline(true);page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('dialog',{name:'Recuperação local disponível'}).waitFor();await page.getByRole('button',{name:'Restaurar cópia',exact:true}).click();assert.equal(await page.getByPlaceholder('Nome da Escola').inputValue(),'Trabalho não salvo');assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'school.grade'),'utf8')).nomeEscola,'Escola alterada no teste');
});
test('botão interromper encerra cálculo sem apagar aulas existentes',async()=>{
 const {project,lesson}=require('./fixtures.cjs');const p=project(5);p.turmas=[];p.professores=[];p.matrizCurricular=[];
 for(let i=0;i<6;i++){p.turmas.push({id:'c'+i,nome:'Turma '+i,sigla:'T'+i,turnoId:'t',salaPadrao:'Sala compartilhada'});p.professores.push({id:'p'+i,nome:'Docente '+i,sigla:'P'+i,limiteAulasDia:5,evitarJanelas:false});p.matrizCurricular.push({id:'m'+i,turmaId:'c'+i,professorId:'p'+i,disciplinaId:'d',aulasSemanais:5,permiteGeminada:false,maximoAulasDia:1});}
 p.gradeHorario=[lesson({matrizItemId:'m0',turmaId:'c0',professorId:'p0'})];const file=path.join(dir,'cancelamento.grade');fs.writeFileSync(file,JSON.stringify(p));await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
 await page.getByRole('button',{name:'Abrir...',exact:true}).click();await page.getByRole('button',{name:'Descartar e continuar',exact:true}).click();await page.getByRole('region',{name:'Avisos do projeto'}).waitFor();
 await page.getByRole('button',{name:'Gerar Horário (Cálculo)',exact:true}).click();await page.getByRole('button',{name:'Gerar Horário Escolar',exact:true}).click();await page.getByRole('button',{name:'Interromper Cálculo',exact:true}).click();await page.getByText('Cálculo interrompido',{exact:true}).waitFor();
 assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')).gradeHorario,p.gradeHorario);assert.equal(await page.getByRole('button',{name:'Gerar Horário Escolar',exact:true}).isEnabled(),true);assert.deepEqual(errors,[]);
});
test('avisos extensos preservam navegação e teclado em nove combinações',async()=>{
 const evidence=path.resolve('artifacts/missao03');fs.mkdirSync(evidence,{recursive:true});const metrics=[];
 for(const size of ['pequena','media','grande'])for(const [width,height] of [[800,600],[1280,840],[1920,1080]]){
  await page.setViewportSize({width,height});
  const file=path.resolve('tests/fixtures/homologacao',size+'.json');
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
  await page.getByRole('button',{name:'Abrir...',exact:true}).click();
  const discard=page.getByRole('button',{name:'Descartar e continuar',exact:true});if(await discard.isVisible())await discard.click();
  await page.getByText(path.basename(file),{exact:true}).waitFor();
  const notice=page.getByRole('region',{name:'Avisos do projeto'}),summary=notice.locator('summary');await summary.waitFor();
  if(await notice.locator('details').evaluate(e=>e.open))await summary.press('Enter');
  assert.equal(await notice.locator('details').evaluate(e=>e.open),false);
  await summary.focus();await summary.press('Enter');assert.equal(await notice.locator('details').evaluate(e=>e.open),true);
  const details=notice.getByLabel('Detalhes dos avisos');assert.ok(await details.evaluate(e=>e.clientHeight<=innerHeight*.18+1));
  await details.focus();await details.press('End');
  await page.getByRole('button',{name:'Gerar Horário (Cálculo)',exact:true}).click();
  await page.getByRole('button',{name:'Gerar Horário Escolar',exact:true}).waitFor();
  metrics.push({size,width,height,noticeHeight:await notice.evaluate(e=>e.getBoundingClientRect().height),navigation:'accessible without dismissing warnings'});
  if(width===1280)await page.screenshot({path:path.join(evidence,`layout-${size}.png`)});
 }
 fs.writeFileSync(path.join(evidence,'layout.json'),JSON.stringify(metrics,null,2));assert.deepEqual(errors,[]);
});
test('Electron gera os três cenários e exporta quadro geral legível',async()=>{
 const {validate}=require('./helpers/oraculo.cjs');const metrics=[];
 for(const size of ['pequena','media','grande']){
  const file=path.resolve('tests/fixtures/homologacao',size+'.json');
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
  await page.getByRole('button',{name:'Abrir...',exact:true}).click();
  const discard=page.getByRole('button',{name:'Descartar e continuar',exact:true});if(await discard.isVisible())await discard.click();
  await page.getByRole('button',{name:'Gerar Horário (Cálculo)',exact:true}).click();
  const start=performance.now();await page.getByRole('button',{name:'Gerar Horário Escolar',exact:true}).click();
  await page.getByText('Grade Gerada com Sucesso!',{exact:true}).waitFor({timeout:35000});
  const output=path.join(dir,size+'.grade');await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},output);
  // Save As is required: fixture paths are never overwritten.
  await page.keyboard.press('Control+Shift+s');await page.waitForFunction(()=>!document.body.innerText.includes('Alterações não salvas'));
  const generated=JSON.parse(fs.readFileSync(output));assert.equal(validate(generated).valid,true);
  fs.writeFileSync(path.resolve('artifacts/missao03',size+'-desktop-gerada.json'),JSON.stringify(generated,null,2));
  metrics.push({size,wallMs:performance.now()-start,aulas:generated.gradeHorario.length});
  await page.getByRole('button',{name:'Relatórios e Impressão',exact:true}).click();
  const pdf=path.resolve('artifacts/missao03',`${size}-quadro.pdf`);
  await app.evaluate(({BrowserWindow},file)=>{globalThis.pendingPdf=new Promise(resolve=>BrowserWindow.getAllWindows()[0].webContents.session.once('will-download',(_,item)=>{item.setSavePath(file);item.once('done',(_,state)=>resolve(state));}));},pdf);
  await page.getByRole('button',{name:'Baixar Quadro Geral (PDF)',exact:true}).click();
  assert.equal(await app.evaluate(()=>globalThis.pendingPdf),'completed');assert.ok(fs.readFileSync(pdf,'latin1').startsWith('%PDF-'));
 }
 fs.writeFileSync(path.resolve('artifacts/missao03/desktop-scenarios.json'),JSON.stringify(metrics,null,2));assert.deepEqual(errors,[]);
});
