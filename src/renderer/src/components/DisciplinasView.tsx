import React, { useState } from 'react';
import { Disciplina } from '../../../shared/types';
import { BookOpen, Plus, Trash2, Edit2, AlertCircle, Sparkles, Palette } from 'lucide-react';

interface Props {
  disciplinas: Disciplina[];
  onChange: (disciplinas: Disciplina[]) => void;
  onRemoverDisciplina?: (id: string) => void;
  onLimparTodas?: () => void;
}

// Cores recomendadas e contrastantes para matérias escolares
const PALETA_CORES = [
  { nome: 'Azul Real', hex: '#2563eb' },
  { nome: 'Vermelho Carmim', hex: '#dc2626' },
  { nome: 'Verde Esmeralda', hex: '#059669' },
  { nome: 'Laranja Âmbar', hex: '#d97706' },
  { nome: 'Roxo Violeta', hex: '#7c3aed' },
  { nome: 'Rosa Magenta', hex: '#db2777' },
  { nome: 'Verde Oliva', hex: '#4d7c0f' },
  { nome: 'Ciano Oceano', hex: '#0891b2' },
  { nome: 'Castanho Terra', hex: '#92400e' },
  { nome: 'Grafite Escuro', hex: '#374151' },
];

// Matérias pré-definidas comuns da BNCC para criação rápida com 1 clique
const SUGESTOES_BNCC = [
  { nome: 'Língua Portuguesa', sigla: 'POR', cor: '#dc2626' },
  { nome: 'Matemática', sigla: 'MAT', cor: '#2563eb' },
  { nome: 'História', sigla: 'HIS', cor: '#d97706' },
  { nome: 'Geografia', sigla: 'GEO', cor: '#4d7c0f' },
  { nome: 'Ciências', sigla: 'CIE', cor: '#059669' },
  { nome: 'Educação Física', sigla: 'EDF', cor: '#ea580c' },
  { nome: 'Artes', sigla: 'ART', cor: '#db2777' },
  { nome: 'Língua Inglesa', sigla: 'ING', cor: '#0891b2' },
  { nome: 'Ensino Religioso', sigla: 'ER', cor: '#7c3aed' },
  { nome: 'Redação', sigla: 'RED', cor: '#b91c1c' },
];

export const DisciplinasView: React.FC<Props> = ({
  disciplinas,
  onChange,
  onRemoverDisciplina,
  onLimparTodas,
}) => {
  const [nome, setNome] = useState('');
  const [sigla, setSigla] = useState('');
  const [corHex, setCorHex] = useState('#2563eb');
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Estados dos Modais de Confirmação In-App (evita travamento do Electron com window.confirm)
  const [disciplinaParaExcluir, setDisciplinaParaExcluir] = useState<Disciplina | null>(null);
  const [modalLimparTodasAberto, setModalLimparTodasAberto] = useState(false);

  const salvarDisciplina = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;

    const siglaFinal = sigla.trim() || nomeLimpo.slice(0, 3).toUpperCase();

    if (editandoId) {
      onChange(
        disciplinas.map((d) =>
          d.id === editandoId ? { ...d, nome: nomeLimpo, sigla: siglaFinal, corHex } : d
        )
      );
      setEditandoId(null);
    } else {
      const nova: Disciplina = {
        id: `disc-${crypto.randomUUID()}`,
        nome: nomeLimpo,
        sigla: siglaFinal,
        corHex,
      };
      onChange([...disciplinas, nova]);
    }

    setNome('');
    setSigla('');
    setCorHex('#2563eb');
  };

  const iniciarEdicao = (d: Disciplina) => {
    setEditandoId(d.id);
    setNome(d.nome);
    setSigla(d.sigla);
    setCorHex(d.corHex || '#2563eb');
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNome('');
    setSigla('');
    setCorHex('#2563eb');
  };

  // Preencher formulário a partir de uma sugestão da BNCC
  const aplicarSugestao = (sugestao: { nome: string; sigla: string; cor: string }) => {
    setNome(sugestao.nome);
    setSigla(sugestao.sigla);
    setCorHex(sugestao.cor);
  };

  // Confirmar exclusão individual
  const handleConfirmarExclusao = () => {
    if (!disciplinaParaExcluir) return;
    const id = disciplinaParaExcluir.id;

    if (editandoId === id) {
      cancelarEdicao();
    }

    if (onRemoverDisciplina) {
      onRemoverDisciplina(id);
    } else {
      onChange(disciplinas.filter((d) => d.id !== id));
    }

    setDisciplinaParaExcluir(null);
  };

  // Confirmar limpeza de todas
  const handleConfirmarLimparTodas = () => {
    cancelarEdicao();
    if (onLimparTodas) {
      onLimparTodas();
    } else {
      onChange([]);
    }
    setModalLimparTodasAberto(false);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b-4 border-[#7e9a72] pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#141c12] flex items-center gap-3">
            <BookOpen className="w-9 h-9 text-[#141c12]" /> Cadastro de Disciplinas
          </h2>
          <p className="text-[#283824] text-xl font-bold mt-1">
            Cadastre as matérias escolares e suas cores para visualização clara e destacada na grade de horários.
          </p>
        </div>

        {disciplinas.length > 0 && (
          <button
            type="button"
            onClick={() => setModalLimparTodasAberto(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-900 font-black rounded-xl border-2 border-rose-400 text-base shadow-sm transition-colors cursor-pointer"
            title="Excluir todas as disciplinas para começar do zero"
          >
            <Trash2 className="w-5 h-5 text-rose-700" /> Limpar Todas
          </button>
        )}
      </div>

      {/* Formulário de Cadastro / Edição */}
      <form
        onSubmit={salvarDisciplina}
        className="bg-[#fff8e4] border-3 border-[#a2bc97] rounded-2xl p-6 shadow-md space-y-5"
      >
        <div className="flex items-center justify-between border-b-2 border-[#ecd293] pb-3">
          <h3 className="text-2xl font-black text-[#141c12] flex items-center gap-2">
            {editandoId ? '✏️ Editar Disciplina' : '➕ Adicionar Nova Disciplina'}
          </h3>
          {editandoId && (
            <span className="text-sm font-black bg-[#141c12] text-[#fbe5ac] px-3 py-1 rounded-full">
              Modo Edição Ativo
            </span>
          )}
        </div>

        {/* Atalhos Rápidos da BNCC */}
        <div>
          <label className="block text-sm font-black text-[#283824] uppercase tracking-wider mb-2 flex items-center gap-1.5" htmlFor="disciplinasview-field-1">
            <Sparkles className="w-4 h-4 text-[#283824]" /> Sugestões Rápidas da BNCC (Clique para Preencher):
          </label>
          <div className="flex flex-wrap gap-2">
            {SUGESTOES_BNCC.map((sug) => (
              <button
                key={sug.sigla}
                type="button"
                onClick={() => aplicarSugestao(sug)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffffff] hover:bg-[#ecd293] border-2 border-[#7e9a72] rounded-lg text-sm font-black text-[#141c12] shadow-sm transition-all cursor-pointer hover:scale-105"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block border border-[#141c12]"
                  style={{ backgroundColor: sug.cor }}
                />
                <span>{sug.nome}</span>
                <span className="text-xs font-mono font-bold text-[#4c6b45]">({sug.sigla})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Campos Principais */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          {/* Nome da Disciplina */}
          <div className="md:col-span-5">
            <label className="block text-[#141c12] font-black mb-1.5 text-lg">
              Nome da Disciplina:
            </label>
            <input id="disciplinasview-field-1"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-[#ffffff] border-3 border-[#141c12] rounded-xl px-4 py-3 text-xl font-black text-[#141c12] focus:outline-none focus:ring-4 focus:ring-[#7e9a72]/50 shadow-inner"
              placeholder="Ex: Língua Portuguesa"
            />
          </div>

          {/* Sigla Curta */}
          <div className="md:col-span-3">
            <label className="block text-[#141c12] font-black mb-1.5 text-lg" htmlFor="disciplinasview-field-2">
              Sigla (Ex: POR, MAT):
            </label>
            <input id="disciplinasview-field-2"
              type="text"
              value={sigla}
              onChange={(e) => setSigla(e.target.value)}
              className="w-full bg-[#ffffff] border-3 border-[#141c12] rounded-xl px-4 py-3 text-xl font-black text-[#141c12] focus:outline-none focus:ring-4 focus:ring-[#7e9a72]/50 uppercase shadow-inner"
              placeholder="Ex: POR"
            />
          </div>

          {/* Seletor de Cor */}
          <div className="md:col-span-4">
            <label className="block text-[#141c12] font-black mb-1.5 text-lg flex items-center gap-1.5">
              <Palette className="w-5 h-5 text-[#141c12]" /> Cor na Grade:
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={corHex}
                onChange={(e) => setCorHex(e.target.value)}
                className="w-14 h-12 bg-[#ffffff] cursor-pointer rounded-xl border-3 border-[#141c12] shadow-sm p-1"
                title="Escolher cor personalizada"
              />
              {/* Paleta rápida */}
              <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                {PALETA_CORES.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setCorHex(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 rounded-lg border-2 transition-transform cursor-pointer hover:scale-110 ${
                      corHex === c.hex ? 'border-[#141c12] ring-2 ring-[#141c12] scale-110' : 'border-white'
                    }`}
                    title={c.nome}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Pré-visualização do Card da Disciplina */}
          <div className="md:col-span-7 bg-[#ffffff] p-3.5 rounded-xl border-2 border-[#a2bc97] flex items-center justify-between shadow-inner">
            <span className="text-sm font-black text-[#4c6b45]">Visual na Grade:</span>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#141c12] shadow-sm"
              style={{ backgroundColor: corHex, color: '#ffffff' }}
            >
              <strong className="text-base font-black tracking-wide">
                {nome.trim() || 'Nome da Disciplina'}
              </strong>
              <span className="bg-[#141c12]/50 px-2 py-0.5 rounded text-xs font-mono font-black">
                {sigla.trim().toUpperCase() || 'SIG'}
              </span>
            </div>
          </div>

          {/* Botões do Formulário */}
          <div className="md:col-span-5 flex justify-end gap-3">
            {editandoId && (
              <button
                type="button"
                onClick={cancelarEdicao}
                className="px-5 py-3.5 bg-[#ffffff] hover:bg-[#ecd293] text-[#141c12] font-black text-lg rounded-xl border-2 border-[#141c12] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#141c12] hover:bg-[#283824] text-[#fbe5ac] font-black rounded-xl shadow-lg transition-all text-xl border-2 border-[#141c12] cursor-pointer"
            >
              <Plus className="w-7 h-7 text-[#fbe5ac]" />
              {editandoId ? 'Atualizar Disciplina' : 'Cadastrar Disciplina'}
            </button>
          </div>
        </div>
      </form>

      {/* Grid de Cards de Disciplinas Cadastradas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-2xl font-black text-[#141c12]">
            Disciplinas Cadastradas ({disciplinas.length})
          </h3>
          <span className="text-base font-bold text-[#283824]">
            {disciplinas.length === 0 ? 'Nenhuma matéria inserida' : 'Prontas para a Matriz Curricular'}
          </span>
        </div>

        {disciplinas.length === 0 ? (
          <div className="bg-[#fff8e4] border-3 border-dashed border-[#7e9a72] rounded-2xl p-10 text-center space-y-4">
            <BookOpen className="w-16 h-16 text-[#7e9a72] mx-auto" />
            <h4 className="text-2xl font-black text-[#141c12]">
              Nenhuma disciplina cadastrada ainda
            </h4>
            <p className="text-lg font-bold text-[#283824] max-w-xl mx-auto">
              Utilize o formulário acima para adicionar as disciplinas da sua escola ou clique nas <strong>Sugestões Rápidas da BNCC</strong> para preencher com um único clique.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {disciplinas.map((disc) => (
              <div
                key={disc.id}
                className="bg-[#fff8e4] border-3 border-[#a2bc97] hover:border-[#141c12] rounded-2xl p-5 shadow-sm flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  <span
                    className="w-10 h-10 rounded-xl border-2 border-[#141c12] shadow-sm shrink-0"
                    style={{ backgroundColor: disc.corHex }}
                  />
                  <div className="truncate">
                    <h4 className="font-black text-[#141c12] text-xl truncate" title={disc.nome}>
                      {disc.nome}
                    </h4>
                    <span className="text-sm font-mono font-black text-[#141c12] bg-[#a2bc97]/50 px-2.5 py-0.5 rounded-full border border-[#7e9a72] inline-block mt-0.5">
                      Sigla: {disc.sigla}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => iniciarEdicao(disc)}
                    className="p-2 text-[#141c12] hover:bg-[#ffffff] rounded-xl border-2 border-[#141c12] shadow-sm transition-colors cursor-pointer"
                    title="Editar esta disciplina"
                  >
                    <Edit2 className="w-5 h-5 text-[#141c12]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisciplinaParaExcluir(disc)}
                    className="p-2 text-rose-700 hover:text-rose-900 hover:bg-rose-100 rounded-xl border-2 border-transparent hover:border-rose-400 transition-colors cursor-pointer"
                    title="Excluir disciplina"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL IN-APP DE EXCLUSÃO INDIVIDUAL (SEM WINDOW.CONFIRM) */}
      {/* ========================================================= */}
      {disciplinaParaExcluir && (
        <div className="fixed inset-0 z-50 bg-[#141c12]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fff8e4] border-4 border-rose-600 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertCircle className="w-9 h-9 shrink-0" />
              <h3 className="text-2xl font-black text-[#141c12]">Excluir Disciplina</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xl font-bold text-[#141c12]">
                Deseja realmente excluir a matéria{' '}
                <strong className="text-2xl font-black text-rose-800">
                  "{disciplinaParaExcluir.nome}" ({disciplinaParaExcluir.sigla})
                </strong>
                ?
              </p>
              <p className="text-base font-bold text-amber-900 bg-amber-100 p-3 rounded-lg border border-amber-300">
                ⚠️ Observação: As aulas e vínculos desta disciplina serão removidos da matriz curricular e da grade.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDisciplinaParaExcluir(null)}
                  className="px-6 py-2.5 bg-[#ffffff] hover:bg-[#ecd293] text-[#141c12] font-black text-lg rounded-xl border-2 border-[#141c12] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarExclusao}
                  className="px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-lg rounded-xl border-2 border-rose-900 shadow-md transition-colors cursor-pointer"
                >
                  Sim, Excluir Matéria
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL IN-APP PARA LIMPAR TODAS AS DISCIPLINAS             */}
      {/* ========================================================= */}
      {modalLimparTodasAberto && (
        <div className="fixed inset-0 z-50 bg-[#141c12]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fff8e4] border-4 border-rose-600 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertCircle className="w-9 h-9 shrink-0" />
              <h3 className="text-2xl font-black text-[#141c12]">Limpar Todas as Disciplinas</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xl font-bold text-[#141c12]">
                Tem certeza que deseja apagar todas as{' '}
                <strong className="text-2xl font-black text-rose-800">
                  {disciplinas.length} disciplinas
                </strong>{' '}
                cadastradas?
              </p>
              <p className="text-base font-bold text-amber-900 bg-amber-100 p-3 rounded-lg border border-amber-300">
                Essa ação deixará a lista em branco para você cadastrar as matérias do zero.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalLimparTodasAberto(false)}
                  className="px-6 py-2.5 bg-[#ffffff] hover:bg-[#ecd293] text-[#141c12] font-black text-lg rounded-xl border-2 border-[#141c12] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarLimparTodas}
                  className="px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-lg rounded-xl border-2 border-rose-900 shadow-md transition-colors cursor-pointer"
                >
                  Sim, Limpar Todas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
