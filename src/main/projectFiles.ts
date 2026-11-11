import path from 'path';
import { ProjetoHorario } from '../shared/types';
import { carregarProjetoComAvisos, fingerprint, salvarProjetoArquivo } from './database';
/** The renderer never grants filesystem authority by supplying a path. */
export class ProjectFiles {
    private current: {
        path: string;
        fingerprint: string | null;
    } | null = null;
    open(file: string) {
        const result = carregarProjetoComAvisos(file);
        const resolved=path.resolve(file),backup=/\.bak$/i.test(file);
        this.current=backup?null:{path:resolved,fingerprint:fingerprint(file)};
        return {...result,caminho:resolved,backup,avisos:backup?[...result.avisos,'Backup aberto para recuperação. Salve em um novo destino para preservar esta cópia.']:result.avisos};
    }
    reset() { this.current = null; }
    save(requested: string | null, projeto: ProjetoHorario, selected?: string) {
        if (requested !== null && (!this.current || path.resolve(requested) !== this.current.path))
            throw new Error('Caminho não autorizado. Use Salvar como e selecione um destino.');
        if (requested === null && !selected)
            throw new Error('Selecione um destino no diálogo do sistema.');
        const file = requested === null ? path.resolve(selected!) : this.current!.path;
        const expected = requested === null ? fingerprint(file) : this.current!.fingerprint;
        const saved = salvarProjetoArquivo(file, projeto, expected);
        this.current = { path: file, fingerprint: fingerprint(file) };
        return { caminho: file, projeto: saved };
    }
}
