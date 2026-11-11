export function origemPermitida(url: string, devUrl?: string): boolean {
    try {
        const u = new URL(url);
        return devUrl ? u.origin === new URL(devUrl).origin : u.protocol === 'app:' && u.hostname === 'local';
    }
    catch {
        return false;
    }
}
export function validarEmissor(event: {
    sender: unknown;
    senderFrame: unknown;
}, webContents: {
    mainFrame: unknown;
}, devUrl?: string): void {
    const frame=event.senderFrame as {url?:string}|null;
    if (event.sender !== webContents || event.senderFrame !== webContents.mainFrame || !frame || typeof frame.url!=='string' || !origemPermitida(frame.url,devUrl))
        throw new Error('Emissor IPC não autorizado.');
}
export function validarDevUrl(value: string | undefined, packaged: boolean): string | undefined {
    if (!value || packaged)
        return undefined;
    const u = new URL(value);
    if (u.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) || u.port !== '5173' || u.username || u.password)
        throw new Error('Servidor de desenvolvimento deve usar localhost:5173.');
    return u.origin;
}
