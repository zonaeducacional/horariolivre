import { app, BrowserWindow, Menu, protocol, net } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { registerIpcHandlers, WindowState } from './ipcHandlers';
import { origemPermitida, validarDevUrl } from './security';
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
app.enableSandbox();
// Optional graphics compatibility preserves the Chromium sandbox.
if (process.env.VIBELAB_SOFTWARE_RENDERING === '1')
    app.disableHardwareAcceleration();
let mainWindow: BrowserWindow | null = null;
const devUrl = validarDevUrl(process.env.VITE_DEV_SERVER_URL, app.isPackaged);
async function createWindow() {
    const state: WindowState = { dirty: false, allowClose: false };
    const window = new BrowserWindow({ width: 1280, height: 840, minWidth: 800, minHeight: 600, title: 'Vibe Lab Horário', backgroundColor: '#fbe5ac', webPreferences: { preload: path.join(app.getAppPath(), 'dist-electron/preload/index.js'), sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true } });
    mainWindow = window;
    window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    window.webContents.session.setPermissionCheckHandler(() => false);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (!origemPermitida(url, devUrl))
        event.preventDefault(); });
    window.webContents.on('will-redirect',(event,url)=>{if(!origemPermitida(url,devUrl))event.preventDefault();});
    window.webContents.session.webRequest.onHeadersReceived((details, callback) => callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [
                devUrl ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws://localhost:5173 ws://127.0.0.1:5173; object-src 'none'; base-uri 'none'; frame-src 'none'" : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'"
            ] } }));
    registerIpcHandlers(window, state, path.join(app.getPath('userData'), 'recovery-v1.grade'), devUrl);
    const action = (value: string) => window.webContents.send('menu:action', value);
    window.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown' || (!input.control && !input.meta) || input.alt)
            return;
        const key = input.key.toLowerCase();
        const value = key === 's' ? (input.shift ? 'saveAs' : 'save') : key === 'o' ? 'open' : key === 'n' ? 'new' : undefined;
        if (value) {
            event.preventDefault();
            action(value);
        }
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'Arquivo', submenu: [{ label: 'Novo', accelerator: 'CmdOrCtrl+N', click: () => action('new') }, { label: 'Abrir…', accelerator: 'CmdOrCtrl+O', click: () => action('open') }, { label: 'Salvar', accelerator: 'CmdOrCtrl+S', click: () => action('save') }, { label: 'Salvar como…', accelerator: 'CmdOrCtrl+Shift+S', click: () => action('saveAs') }, { type: 'separator' }, { label: 'Sair', click: () => window.close() }] }, { label: 'Exibir', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }, ...(!app.isPackaged ? [{ role: 'toggleDevTools' as const }] : [])] }]));
    window.on('close', event => { if (state.dirty && !state.allowClose) {
        event.preventDefault();
        action('close');
    } });
    window.on('closed', () => { if (mainWindow === window)
        mainWindow = null; });
    if (devUrl)
        await window.loadURL(devUrl);
    else
        await window.loadURL('app://local/index.html');
}
const primary=app.requestSingleInstanceLock();
if(!primary)app.quit();
app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus();}});
if(primary)app.whenReady().then(async () => {
    const root = path.resolve(app.getAppPath(), 'dist');
    protocol.handle('app', request => {
        const url = new URL(request.url);
        if (url.hostname !== 'local')
            return new Response('Forbidden', { status: 403 });
        let target: string;
        try {
            target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
        }
        catch {
            return new Response('Bad request', { status: 400 });
        }
        if (!target.startsWith(root + path.sep))
            return new Response('Forbidden', { status: 403 });
        return net.fetch(pathToFileURL(target).toString());
    });
    await createWindow();
}).catch(error => { console.error('Falha ao iniciar aplicativo:', error instanceof Error ? error.message : 'erro'); app.quit(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin')
    app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0)
    void createWindow(); });
