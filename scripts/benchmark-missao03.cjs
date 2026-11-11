// Fresh process per sample; no certificates are loaded by the generator.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),lab=path.join(root,'artifacts/missao03');
if(process.argv[2]==='sample'){
 const [variant,size]=process.argv.slice(3),input=path.join(root,'tests/fixtures/homologacao',size+'.json');
 const p=JSON.parse(fs.readFileSync(input)),{TimetableCspSolver}=require(path.join(root,variant==='before'?'artifacts/missao03/baseline':'dist-electron','solver/cspSolver.js'));
 const {validate}=require(path.join(root,'tests/helpers/oraculo.cjs'));
 const solver=new TimetableCspSolver(p),cpu=process.cpuUsage(),start=performance.now(),r=solver.solve(),elapsed=performance.now()-start,used=process.cpuUsage(cpu);
 const oracle=r.sucesso?validate(p,r.grade):null;
 if(r.sucesso)fs.writeFileSync(path.join(lab,variant+'-'+size+'-gerada.json'),JSON.stringify({...p,gradeHorario:r.grade,gradeDesatualizada:false},null,2));
 console.log(JSON.stringify({variant,size,node:process.version,fixtureSha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(input)).digest('hex'),elapsedMs:elapsed,cpuMs:(used.user+used.system)/1000,maxRssMiB:process.resourceUsage().maxRSS/1024,status:r.status,aulas:r.grade.length,oracle,diagnostics:solver.diagnostics}));
 if(r.sucesso&&(!oracle.valid))process.exitCode=1;
}else{
 const variant=process.argv[2]||'after',repeats=Number(process.argv[3]||5),rows=[];
 fs.mkdirSync(lab,{recursive:true});
 for(let n=0;n<repeats;n++)for(const size of ['pequena','media','grande']){
  const r=cp.spawnSync(process.execPath,[__filename,'sample',variant,size],{encoding:'utf8',timeout:40000});
  if(r.status!==0)throw Error(r.stderr||r.error||r.stdout);
  const row=JSON.parse(r.stdout);rows.push(row);fs.writeFileSync(path.join(lab,variant+'.json'),JSON.stringify(rows,null,2));console.log(JSON.stringify(row));
 }
}
