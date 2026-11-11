import { parentPort, workerData } from 'worker_threads';
import { TimetableCspSolver } from './cspSolver';
const port = parentPort;
if (!port) throw new Error('Solver deve executar em worker.');
const solver = new TimetableCspSolver(workerData.projeto, progress => port.postMessage({ type: 'progress', progress }), {
  cancelFlag: new Int32Array(workerData.cancelBuffer),
  maxTimeMs: workerData.maxTimeMs,
  maxIterations: workerData.maxIterations,
});
port.postMessage({ type: 'result', result: solver.solve() });
