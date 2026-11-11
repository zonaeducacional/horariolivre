import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import { ProjetoHorario } from '../shared/types';
import { lerProjeto, validarEstrutura, validarGrade, MAX_PROJECT_BYTES } from '../shared/rules';
export { criarProjetoPadrao } from '../shared/defaultProject';

export function fingerprint(file: string): string | null {
  if (!fs.existsSync(file)) return null;
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Selecione um arquivo regular, sem link simbólico.');
  if (stat.size > MAX_PROJECT_BYTES) throw new Error('Arquivo excede o limite de 10 MiB.');
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function syncDirectory(directory: string) {
  // Windows does not expose POSIX directory fsync through Node.
  if (process.platform === 'win32') return;
  const fd = fs.openSync(directory, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
export function gravarAtomico(file: string, content: string | Uint8Array): void {
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  let fd: number | undefined;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, content);
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = undefined;
    fs.renameSync(temp, file);
    syncDirectory(path.dirname(file));
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temp)) fs.unlinkSync(temp); // only the temporary file created by this call
  }
}
export function salvarProjetoArquivo(file: string, projeto: ProjetoHorario, expected?: string | null): ProjetoHorario {
  validarEstrutura(projeto);
  const atual = fingerprint(file);
  if (expected !== undefined && expected !== atual) throw new Error('O arquivo foi alterado fora do aplicativo. Use Salvar como para preservar as duas versões.');
  const saved = { ...projeto, ultimaModificacao: new Date().toISOString(), gradeDesatualizada: projeto.gradeDesatualizada || validarGrade(projeto, projeto.gradeHorario, true).length > 0 };
  const content = JSON.stringify(saved, null, 2);
  if (Buffer.byteLength(content) > MAX_PROJECT_BYTES) throw new Error('Projeto excede o limite de 10 MiB.');
  if (atual !== null) {
    // Do not replace a damaged original (or the last valid backup) implicitly.
    lerProjeto(fs.readFileSync(file, 'utf8'));
    const backup = `${file}.bak`;
    if (fs.existsSync(backup) && fs.lstatSync(backup).isSymbolicLink()) throw new Error('Backup é um link simbólico; escolha outro destino.');
    gravarAtomico(backup, fs.readFileSync(file));
    if (fingerprint(file) !== atual) throw new Error('O arquivo mudou durante o salvamento. Original preservado; tente Salvar como.');
  }
  gravarAtomico(file, content);
  return saved;
}
export function carregarProjetoComAvisos(file: string) {
  fingerprint(file); // limits and regular-file check before reading
  try { return lerProjeto(fs.readFileSync(file, 'utf8')); }
  catch (error) { throw new Error(`${error instanceof Error ? error.message : 'Falha na leitura.'}\nO original foi preservado. Se existir, abra o arquivo ${path.basename(file)}.bak para recuperação e use Salvar como.`); }
}
export function carregarProjetoArquivo(file: string): ProjetoHorario { return carregarProjetoComAvisos(file).projeto; }
