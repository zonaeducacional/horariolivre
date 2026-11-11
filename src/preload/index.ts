import { contextBridge, ipcRenderer } from 'electron';
import type { ProjetoHorario, SolverProgress, SolverResult } from '../shared/types';
type FileResult = {
    sucesso: boolean;
    caminho?: string;
    projeto?: ProjetoHorario;
    avisos?: string[];
    backup?: boolean;
    erro?: string;
};
export interface IElectronAPI {
    novoProjeto: () => Promise<ProjetoHorario>;
    abrirProjeto: () => Promise<FileResult>;
    salvarProjeto: (caminho: string | null, projeto: ProjetoHorario) => Promise<FileResult>;
    recuperarProjeto: () => Promise<FileResult>;
    guardarRecuperacao: (projeto: ProjetoHorario) => Promise<FileResult>;
    marcarAlterado: (dirty: boolean) => Promise<FileResult>;
    fecharJanela: () => Promise<FileResult>;
    executarSolver: (projeto: ProjetoHorario) => Promise<SolverResult & {
        erro?: string;
    }>;
    cancelarSolver: () => Promise<void>;
    onSolverProgress: (callback: (progress: SolverProgress) => void) => () => void;
    onMenu: (callback: (action: 'new' | 'open' | 'save' | 'saveAs' | 'close') => void) => () => void;
    onRecoveryError: (callback: (message: string) => void) => () => void;
    exportarExcel: (projeto: ProjetoHorario) => Promise<FileResult>;
}
function listen<T>(channel: string, callback: (value: T) => void) { const handler = (_event: unknown, value: T) => callback(value); ipcRenderer.on(channel, handler); return () => ipcRenderer.removeListener(channel, handler); }
const api: IElectronAPI = {
    novoProjeto: () => ipcRenderer.invoke('project:new'),
    abrirProjeto: () => ipcRenderer.invoke('project:open'),
    salvarProjeto: (caminho, projeto) => ipcRenderer.invoke('project:save', caminho, projeto),
    recuperarProjeto: () => ipcRenderer.invoke('project:recover'),
    guardarRecuperacao: projeto => ipcRenderer.invoke('project:recovery', projeto),
    marcarAlterado: dirty => ipcRenderer.invoke('project:dirty', dirty),
    fecharJanela: () => ipcRenderer.invoke('window:close'),
    executarSolver: projeto => ipcRenderer.invoke('solver:run', projeto),
    cancelarSolver: () => ipcRenderer.invoke('solver:cancel'),
    onSolverProgress: callback => listen('solver:progress', callback),
    onMenu: callback => listen('menu:action', callback),
    onRecoveryError: callback => listen('recovery:error', callback),
    exportarExcel: projeto => ipcRenderer.invoke('export:excel', projeto),
};
contextBridge.exposeInMainWorld('api', api);
