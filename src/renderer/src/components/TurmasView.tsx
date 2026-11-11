import React, { useState } from 'react';
import { Turma, Turno } from '../../../shared/types';
import { Users, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';

interface Props {
  turmas: Turma[];
  turnos: Turno[];
  onChange: (turmas: Turma[]) => void;
}

export const TurmasView: React.FC<Props> = ({ turmas, turnos, onChange }) => {
  const [nome, setNome] = useState('');
  const [sigla, setSigla] = useState('');
  const [turnoId, setTurnoId] = useState(turnos[0]?.id || '');
  const [salaPadrao, setSalaPadrao] = useState('');
  const [corHex, setCorHex] = useState('#3b82f6');
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const salvarTurma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const siglaFinal = sigla.trim() || nome.slice(0, 4).toUpperCase();

    if (editandoId) {
      onChange(
        turmas.map((t) =>
          t.id === editandoId
            ? { ...t, nome, sigla: siglaFinal, turnoId, salaPadrao, corHex }
            : t
        )
      );
      setEditandoId(null);
    } else {
      const nova: Turma = {
        id: `turma-${crypto.randomUUID()}`,
        nome,
        sigla: siglaFinal,
        turnoId: turnoId || turnos[0]?.id || '',
        salaPadrao,
        corHex,
      };
      onChange([...turmas, nova]);
    }

    setNome('');
    setSigla('');
    setSalaPadrao('');
  };

  const iniciarEdicao = (t: Turma) => {
    setEditandoId(t.id);
    setNome(t.nome);
    setSigla(t.sigla);
    setTurnoId(t.turnoId);
    setSalaPadrao(t.salaPadrao || '');
    setCorHex(t.corHex || '#3b82f6');
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNome('');
    setSigla('');
    setSalaPadrao('');
  };

  const [turmaParaExcluir, setTurmaParaExcluir] = useState<Turma | null>(null);

  const confirmarExclusao = () => {
    if (!turmaParaExcluir) return;
    const id = turmaParaExcluir.id;
    if (editandoId === id) {
      cancelarEdicao();
    }
    onChange(turmas.filter((t) => t.id !== id));
    setTurmaParaExcluir(null);
  };

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-[#7e9a72] pb-4">
        <h2 className="text-3xl font-black text-[#141c12] flex items-center gap-2">
          <Users className="w-8 h-8 text-[#141c12]" /> Cadastro de Turmas
        </h2>
        <p className="text-[#283824] text-lg font-bold">
          Cadastre as turmas, séries ou agrupamentos escolares da sua instituição.
        </p>
      </div>

      {/* Formulário de Cadastro */}
      <form
        onSubmit={salvarTurma}
        className="bg-[#fff8e4] border-2 border-[#a2bc97] rounded-xl p-6 shadow-md space-y-4"
      >
        <h3 className="text-xl font-black text-[#141c12] mb-2">
          {editandoId ? '✏️ Editar Turma' : '➕ Adicionar Nova Turma'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="turmasview-field-1">
              Nome da Turma (Ex: 6º Ano A):
            </label>
            <input id="turmasview-field-1"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2 text-lg text-[#141c12] font-bold focus:border-[#141c12]"
              placeholder="Nome completo da turma"
            />
          </div>

          <div>
            <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="turmasview-field-2">
              Sigla Curta (Ex: 6A):
            </label>
            <input id="turmasview-field-2"
              type="text"
              value={sigla}
              onChange={(e) => setSigla(e.target.value)}
              className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2 text-lg text-[#141c12] font-bold focus:border-[#141c12] uppercase"
              placeholder="Ex: 6A"
            />
          </div>

          <div>
            <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="turmasview-field-3">Turno:</label>
            <select id="turmasview-field-3"
              value={turnoId}
              onChange={(e) => setTurnoId(e.target.value)}
              className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2 text-lg text-[#141c12] font-bold focus:border-[#141c12]"
            >
              {turnos.map((turno) => (
                <option key={turno.id} value={turno.id}>
                  {turno.nome} ({turno.temposCount} aulas)
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="turmasview-field-4">
              Sala Física Padrão (Opcional):
            </label>
            <input id="turmasview-field-4"
              type="text"
              value={salaPadrao}
              onChange={(e) => setSalaPadrao(e.target.value)}
              className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2 text-lg text-[#141c12] font-bold focus:border-[#141c12]"
              placeholder="Ex: Sala 04 - Bloco B"
            />
          </div>

          <div>
            <label className="block text-[#141c12] font-black mb-1 text-base">
              Cor de Identificação:
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={corHex}
                onChange={(e) => setCorHex(e.target.value)}
                className="w-12 h-11 bg-transparent cursor-pointer rounded border-2 border-[#a2bc97]"
              />
              <span className="text-[#141c12] text-base font-mono font-black">{corHex}</span>
            </div>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="w-full py-3 bg-[#141c12] hover:bg-[#283824] text-[#fbe5ac] font-black rounded-lg shadow transition-all text-lg flex items-center justify-center gap-2 border-2 border-[#141c12]"
            >
              <Plus className="w-6 h-6 text-[#fbe5ac]" /> {editandoId ? 'Atualizar' : 'Cadastrar Turma'}
            </button>
            {editandoId && (
              <button
                type="button"
                onClick={cancelarEdicao}
                className="px-4 py-3 bg-[#a2bc97] hover:bg-[#8fae83] text-[#141c12] font-bold rounded-lg text-lg border-2 border-[#7e9a72]"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Tabela de Turmas */}
      <div className="bg-[#fff8e4] border-2 border-[#a2bc97] rounded-xl overflow-hidden shadow-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#a2bc97] text-[#141c12] text-lg font-black border-b-2 border-[#7e9a72]">
              <th className="p-4">Identificação / Cor</th>
              <th className="p-4">Nome da Turma</th>
              <th className="p-4">Sigla</th>
              <th className="p-4">Turno</th>
              <th className="p-4">Sala</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-[#ecd293] text-base">
            {turmas.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#283824] font-bold text-lg">
                  Nenhuma turma cadastrada até o momento.
                </td>
              </tr>
            ) : (
              turmas.map((turma) => {
                const turno = turnos.find((t) => t.id === turma.turnoId);
                return (
                  <tr key={turma.id} className="hover:bg-[#fbe5ac]/60 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-7 h-7 rounded-md border-2 border-[#141c12] shadow"
                          style={{ backgroundColor: turma.corHex || '#3b82f6' }}
                        />
                      </div>
                    </td>
                    <td className="p-4 font-black text-[#141c12] text-lg">{turma.nome}</td>
                    <td className="p-4 font-mono font-black text-[#141c12] text-lg bg-[#a2bc97]/30 px-2 rounded">{turma.sigla}</td>
                    <td className="p-4 text-[#141c12] font-bold text-lg">{turno?.nome || 'Turno não vinculado'}</td>
                    <td className="p-4 text-[#283824] font-semibold text-base">{turma.salaPadrao || '-'}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => iniciarEdicao(turma)}
                        className="p-2 text-[#141c12] hover:bg-[#a2bc97] rounded-lg transition-colors inline-flex border border-[#a2bc97]"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setTurmaParaExcluir(turma)}
                        className="p-2 text-rose-700 hover:text-rose-900 hover:bg-[#fbe5ac] rounded-lg transition-colors inline-flex border border-rose-300 cursor-pointer"
                        title="Remover turma"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal In-App de Exclusão de Turma (Sem window.confirm) */}
      {turmaParaExcluir && (
        <div className="fixed inset-0 z-50 bg-[#141c12]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fff8e4] border-4 border-rose-600 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertCircle className="w-9 h-9 shrink-0" />
              <h3 className="text-2xl font-black text-[#141c12]">Excluir Turma</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xl font-bold text-[#141c12]">
                Deseja realmente excluir a turma{' '}
                <strong className="text-2xl font-black text-rose-800">
                  "{turmaParaExcluir.nome}" ({turmaParaExcluir.sigla})
                </strong>
                ?
              </p>
              <p className="text-base font-bold text-amber-900 bg-amber-100 p-3 rounded-lg border border-amber-300">
                ⚠️ Observação: As matrizes curriculares e horários alocados para esta turma serão removidos.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTurmaParaExcluir(null)}
                  className="px-6 py-2.5 bg-[#ffffff] hover:bg-[#ecd293] text-[#141c12] font-black text-lg rounded-xl border-2 border-[#141c12] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarExclusao}
                  className="px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-lg rounded-xl border-2 border-rose-900 shadow-md transition-colors cursor-pointer"
                >
                  Sim, Excluir Turma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
