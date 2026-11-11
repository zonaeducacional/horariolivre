import { Worker } from 'worker_threads';
import path from 'path';
import { ProjetoHorario, SolverProgress, SolverResult } from '../shared/types';
import { validarEstrutura, validarGrade } from '../shared/rules';
export class SolverRunner {
    private active: {
        worker: Worker;
        cancel: () => Promise<void>;
    } | null = null;
    get running() { return this.active !== null; }
    run(projeto: ProjetoHorario, onProgress: (p: SolverProgress) => void = () => { }, limits: {
        maxTimeMs?: number;
        maxIterations?: number;
    } = {}): Promise<SolverResult> {
        validarEstrutura(projeto);
        if (this.active)
            throw new Error('Já existe um cálculo em execução. Interrompa-o primeiro.');
        const snapshot = structuredClone(projeto);
        const start = Date.now(), buffer = new SharedArrayBuffer(4), flag = new Int32Array(buffer);
        const worker = new Worker(path.join(__dirname, '../solver/worker.js'), { workerData: { projeto: snapshot, cancelBuffer: buffer, ...limits } });
        return new Promise(resolve => {
            let settled = false;
            const finish = (result: SolverResult) => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timer);
                if (this.active?.worker === worker)
                    this.active = null;
                worker.removeAllListeners();
                void worker.terminate();
                resolve(result);
            };
            const failure = (status: 'cancelado' | 'limite' | 'erro', mensagem: string): SolverResult => ({ status, sucesso: false, grade: [], mensagem, tempoGastoMs: Date.now() - start });
            const timer = setTimeout(() => finish(failure('limite', 'Limite temporal atingido. A última grade foi preservada.')), (limits.maxTimeMs ?? 30000) + 1000);
            this.active = { worker, cancel: async () => { Atomics.store(flag, 0, 1); finish(failure('cancelado', 'Cálculo interrompido. A última grade foi preservada.')); await worker.terminate(); } };
            worker.on('message', message => {
                if (settled)
                    return;
                if (message.type === 'progress') {
                    try {onProgress(message.progress);}catch(error){finish(failure('erro',`Falha no progresso: ${error instanceof Error?error.message:'erro'}`));}
                    return;
                }
                if (message.type === 'result') {
                    const r = message.result as SolverResult;
                    const errors = r.sucesso ? validarGrade(snapshot, r.grade, true) : [];
                    finish(errors.length ? failure('erro', `Grade rejeitada: ${errors.join('; ')}`) : r);
                }
            });
            worker.on('error', error => finish(failure('erro', `Falha no worker: ${error.message}`)));
            worker.on('exit', code => { if (!settled)
                finish(failure('erro', `Worker terminou sem resultado (código ${code}).`)); });
        });
    }
    async cancel() { await this.active?.cancel(); }
}
