import { parentPort, workerData } from 'worker_threads';
import { solveTimetable } from './integerSolver';
const port = parentPort;
if (!port) throw new Error('Solver deve executar em worker.');
void solveTimetable(workerData.projeto, progress => port.postMessage({ type: 'progress', progress }), {
  cancelFlag: new Int32Array(workerData.cancelBuffer),
  maxTimeMs: workerData.maxTimeMs,
  maxIterations: workerData.maxIterations,
}).then(result => port.postMessage({ type: 'result', result }));
