/** Native disclosure supports Enter/Space; long diagnostics never grow the shell. */
export function MessageNotice({message,onClose}:{message:string;onClose:()=>void}) {
    const lines=message.split('\n');
    return <section aria-label="Avisos do projeto" className="shrink-0 px-4 py-2 bg-white border-b-2 border-[#141c12]">
      <div className="flex justify-between gap-4 items-start">
        {message.length>240 ? <details key={message} className="min-w-0 flex-1">
          <summary className="cursor-pointer font-bold">{lines.length>1 ? `${lines.length-1} aviso(s) — ver detalhes` : 'Aviso do projeto — ver detalhes'}</summary>
          <div tabIndex={0} aria-label="Detalhes dos avisos" className="max-h-[18vh] overflow-y-auto whitespace-pre-line break-words mt-2">{message}</div>
        </details> : <p role="status" className="min-w-0 break-words">{message}</p>}
        <button className="underline shrink-0" onClick={onClose}>Fechar aviso</button>
      </div>
    </section>;
}
