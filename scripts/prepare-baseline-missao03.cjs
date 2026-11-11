// Rebuild the original solver from the recorded commit without switching branches.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),lab=path.join(root,'artifacts/missao03'),source=path.join(lab,'baseline-source'),output=path.join(lab,'baseline');
for(const file of ['src/solver/cspSolver.ts','src/shared/rules.ts','src/shared/types.ts']){
 const target=path.join(source,file);fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,cp.execFileSync('git',['show','e616ce8:'+file],{cwd:root}));
}
cp.execFileSync(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--target','ES2022','--module','CommonJS','--strict','--esModuleInterop','--skipLibCheck','--rootDir',path.join(source,'src'),'--outDir',output,path.join(source,'src/solver/cspSolver.ts')],{cwd:root,stdio:'inherit'});
const file=path.join(output,'solver/cspSolver.js');let text=fs.readFileSync(file,'utf8');
const replacements=[
 ['const start = Date.now();','this.diagnostics={nodes:0,domains:0,backtracks:0,prunes:0,candidateSlots:0,accepted:0};\n        const start = Date.now();'],
 ['iterations++;','iterations++; this.diagnostics.nodes++;'],
 ['const candidates = (b) => {','const candidates = (b) => { this.diagnostics.domains++;'],
 ['for (const a of grid.splice(before))','this.diagnostics.backtracks++; for (const a of grid.splice(before))'],
 ['if (!choices.length)\n                    return false;','if (!choices.length) {this.diagnostics.prunes++;return false;}'],
 ['let valid = true, penalty = 0;','this.diagnostics.candidateSlots++; let valid = true, penalty = 0;'],
 ['out.push({ day, time, penalty });','this.diagnostics.accepted++; out.push({ day, time, penalty });']
];
for(const [from,to] of replacements){if(!text.includes(from))throw Error('Instrumentação divergente: '+from);text=text.replace(from,to);}
fs.writeFileSync(file,text);console.log('Baseline e616ce8 compilado e instrumentado.');
