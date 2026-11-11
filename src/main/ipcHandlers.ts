import { ipcMain, dialog, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { ProjetoHorario } from '../shared/types';
import { criarProjetoPadrao, carregarProjetoComAvisos, gravarAtomico } from './database';
import { validarEstrutura, lerProjeto } from '../shared/rules';
import { SolverRunner } from './solverRunner';
import { ProjectFiles } from './projectFiles';
import { criarWorkbook } from './excel';
import { validarEmissor } from './security';
export interface WindowState {
    dirty: boolean;
    allowClose: boolean;
}
export function registerIpcHandlers(window: BrowserWindow, state: WindowState, recoveryFile: string, devUrl?: string) {
    const files = new ProjectFiles(), runner = new SolverRunner(), channels: string[] = [];
    let recoveryTimer: ReturnType<typeof setTimeout> | undefined, pendingRecovery: ProjetoHorario | undefined;
    const flushRecovery = () => {
        if (recoveryTimer)
            clearTimeout(recoveryTimer);
        recoveryTimer = undefined;
        if (pendingRecovery) {
            const p = pendingRecovery;
            gravarAtomico(recoveryFile, JSON.stringify(p));
            pendingRecovery = undefined;
        }
    };
    const handle = (channel: string, fn: (e: IpcMainInvokeEvent, ...args: unknown[]) => unknown) => {
        channels.push(channel);
        ipcMain.handle(channel, async (e, ...args) => { validarEmissor(e, window.webContents, devUrl); try {
            return await fn(e, ...args);
        }
        catch (error) {
            return { sucesso: false, erro: error instanceof Error ? error.message : 'Falha na operação.' };
        } });
    };
    handle('project:new', () => { files.reset(); return criarProjetoPadrao(); });
    handle('project:open', async () => {
        const result = await dialog.showOpenDialog(window, { title: 'Abrir horário ou backup', filters: [{ name: 'Projeto e backup', extensions: ['grade', 'json', 'bak'] }], properties: ['openFile'] });
        if (result.canceled || !result.filePaths[0])
            return { sucesso: false };
        return { sucesso: true, ...files.open(result.filePaths[0]) };
    });
    handle('project:save', async (_event, requested, value) => {
        if (requested !== null && typeof requested !== 'string')
            throw new Error('Destino inválido.');
        validarEstrutura(value);
        let selected: string | undefined;
        if (requested === null) {
            const result = await dialog.showSaveDialog(window, { title: 'Salvar horário como', defaultPath: `Horario_${value.anoLetivo}.grade`, filters: [{ name: 'Projeto de horário', extensions: ['grade'] }] });
            if (result.canceled || !result.filePath)
                return { sucesso: false };
            selected = result.filePath;
        }
        const result = files.save(requested as string | null, value, selected);
        return { sucesso: true, ...result };
    });
    handle('project:dirty', (_e, value) => { if (typeof value !== 'boolean')
        throw new Error('Estado inválido.'); state.dirty = value; return { sucesso: true }; });
    handle('project:recovery', (_e, value) => {
        validarEstrutura(value);
        const content = JSON.stringify(value);
        lerProjeto(content);
        state.dirty = true;
        pendingRecovery = structuredClone(value);
        if (recoveryTimer)
            clearTimeout(recoveryTimer);
        recoveryTimer = setTimeout(() => { try {
            flushRecovery();
        }
        catch (error) {
            if (!window.isDestroyed())
                window.webContents.send('recovery:error', error instanceof Error ? error.message : 'Falha ao criar recuperação.');
        } }, 500);
        return { sucesso: true };
    });
    handle('project:recover', () => fs.existsSync(recoveryFile) ? { sucesso: true, ...carregarProjetoComAvisos(recoveryFile) } : { sucesso: false });
    handle('window:close', () => { flushRecovery(); state.allowClose = true; window.close(); return { sucesso: true }; });
    handle('solver:run', async (event, value) => {
        validarEstrutura(value);
        return runner.run(value, progress => { if (!window.isDestroyed())
            event.sender.send('solver:progress', progress); });
    });
    handle('solver:cancel', async () => { await runner.cancel(); return { sucesso: true }; });
    handle('export:excel', async (_event, value) => {
        validarEstrutura(value);
        const wb = criarWorkbook(value);
        const result = await dialog.showSaveDialog(window, { title: 'Exportar grade validada para Excel', defaultPath: `Grade_${value.anoLetivo}.xlsx`, filters: [{ name: 'Excel', extensions: ['xlsx'] }] });
        if (result.canceled || !result.filePath)
            return { sucesso: false };
        if (fs.existsSync(result.filePath) && fs.lstatSync(result.filePath).isSymbolicLink())
            throw new Error('Destino não pode ser link simbólico.');
        gravarAtomico(result.filePath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
        return { sucesso: true, caminho: result.filePath };
    });
    window.on('closed', () => { try {
        flushRecovery();
    }
    catch (error) {
        console.error('Recuperação não gravada:', error instanceof Error ? error.message : 'erro');
    } void runner.cancel(); for (const c of channels)
        ipcMain.removeHandler(c); });
}
