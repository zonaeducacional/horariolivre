import React from 'react';
import { FilePlus, FolderOpen, Save, School } from 'lucide-react';
import { ProjetoHorario } from '../../../shared/types';

interface Props {
  projeto: ProjetoHorario;
  caminhoArquivo: string | null;
  onNovo: () => void;
  onAbrir: () => void;
  onSalvar: () => void;
  onNomeEscolaChange: (nome: string) => void;
  onAnoLetivoChange: (ano: number) => void;
}

export const Navbar: React.FC<Props> = ({
  projeto,
  caminhoArquivo,
  onNovo,
  onAbrir,
  onSalvar,
  onNomeEscolaChange,
  onAnoLetivoChange,
}) => {
  return (
    <header className="bg-[#a2bc97] border-b-2 border-[#7e9a72] px-6 py-3 flex flex-wrap items-center justify-between gap-4 select-none shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#141c12] flex items-center justify-center shadow-md">
            <School className="w-7 h-7 text-[#fbe5ac]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#141c12] tracking-wide leading-none flex items-center gap-2">
              Vibe Lab <span className="text-[#141c12] font-mono text-sm font-bold bg-[#fbe5ac] px-2 py-0.5 rounded border border-[#7e9a72]">Horário</span>
            </h1>
            <span className="text-xs text-[#283824] font-mono font-bold mt-1 block">
              {caminhoArquivo ? caminhoArquivo.split('/').pop() : 'Novo Arquivo (não salvo)'}
            </span>
          </div>
        </div>

        {/* Inputs da Escola e Ano Letivo */}
        <div className="flex flex-wrap items-center gap-2 pl-6 border-l-2 border-[#7e9a72]">
          <input
            type="text"
            value={projeto.nomeEscola}
            onChange={(e) => onNomeEscolaChange(e.target.value)}
            className="bg-[#fff8e4] border-2 border-[#7e9a72] rounded-lg px-3 py-1.5 text-base font-bold text-[#141c12] focus:outline-none focus:border-[#141c12] w-64 shadow-inner"
            placeholder="Nome da Escola"
          />
          <input
            type="text"
            inputMode="numeric"
            value={projeto.anoLetivo || ''}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              onAnoLetivoChange(val === '' ? ('' as any) : parseInt(val, 10));
            }}
            className="bg-[#fff8e4] border-2 border-[#7e9a72] rounded-lg px-3 py-1.5 text-base font-bold text-[#141c12] focus:outline-none focus:border-[#141c12] w-24 text-center shadow-inner"
            placeholder="Ano"
          />
        </div>
      </div>

      {/* Botões de Arquivo */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNovo}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#fff8e4] hover:bg-[#ffffff] text-[#141c12] rounded-lg font-extrabold text-base transition-colors border-2 border-[#7e9a72] shadow-sm"
          title="Criar novo horário escolar"
        >
          <FilePlus className="w-5 h-5 text-[#283824]" /> Novo
        </button>

        <button
          onClick={onAbrir}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#fff8e4] hover:bg-[#ffffff] text-[#141c12] rounded-lg font-extrabold text-base transition-colors border-2 border-[#7e9a72] shadow-sm"
          title="Abrir arquivo existente (.grade)"
        >
          <FolderOpen className="w-5 h-5 text-[#283824]" /> Abrir...
        </button>

        <button
          onClick={onSalvar}
          className="flex items-center gap-2 px-5 py-2 bg-[#141c12] hover:bg-[#283824] text-[#fbe5ac] rounded-lg font-extrabold text-base transition-colors shadow-md border-2 border-[#141c12]"
          title="Salvar alterações no arquivo"
        >
          <Save className="w-5 h-5 text-[#fbe5ac]" /> Salvar
        </button>
      </div>
    </header>
  );
};
