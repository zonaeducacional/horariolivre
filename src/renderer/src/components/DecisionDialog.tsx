import React, { useEffect, useRef } from 'react';
export function DecisionDialog({title,onCancel,children}:{title:string;onCancel:()=>void;children:React.ReactNode}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;ref.current?.focus();return()=>previous?.focus();},[]);
  return <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><div ref={ref} role="dialog" aria-modal="true" aria-labelledby="decision-title" tabIndex={-1} className="bg-[#fff8e4] border-4 border-[#141c12] rounded-xl p-6 max-w-lg w-full space-y-4" onKeyDown={e=>{
    if(e.key==='Escape'){e.preventDefault();onCancel();}
    if(e.key==='Tab'){const nodes=ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[href],input,select,[tabindex="0"]');if(!nodes?.length){e.preventDefault();return;}const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===ref.current)){e.preventDefault();first.focus();}}
  }}><h2 id="decision-title" className="text-2xl font-black">{title}</h2>{children}</div></div>;
}
