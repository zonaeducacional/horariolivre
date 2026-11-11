import React, { useState } from 'react';
import {
  MatrizCurricularItem,
  Turma,
  Professor,
  Disciplina,
  Turno,
} from '../../../shared/types';
import { TableProperties, Plus, Trash2, Edit2, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  matriz: MatrizCurricularItem[];
  turmas: Turma[];
  professores: Professor[];
  disciplinas: Disciplina[];
  turnos: Turno[];
  diasLetivos: number[];
  onChange: (matriz: MatrizCurricularItem[]) => void;
}

export const MatrizView: React.FC<Props> = ({
  matriz,
  turmas,
  professores,
  disciplinas,
  turnos,
  onChange,
  diasLetivos,
}) => {
  const [turmaFiltro, setTurmaFiltro] = useState<string>(turmas[0]?.id || 'todas');

  const [turmaId, setTurmaId] = useState(turmas[0]?.id || '');
  const [disciplinaId, setDisciplinaId] = useState(disciplinas[0]?.id || '');
  const [professorId, setProfessorId] = useState(professores[0]?.id || '');
  const [aulasSemanais, setAulasSemanais] = useState<string | number>('4');
  const [maximoAulasDia,setMaximoAulasDia]=useState(2);
  const [permiteGeminada, setPermiteGeminada] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const salvarItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaId || !disciplinaId || !professorId) return;

    const aulas = Number(aulasSemanais);
    if(!Number.isInteger(aulas)||aulas<1||aulas>60||!Number.isInteger(maximoAulasDia)||maximoAulasDia<1||maximoAulasDia>10)return;

    if (editandoId) {
      onChange(
        matriz.map((m) =>
          m.id === editandoId
            ? { ...m, turmaId, disciplinaId, professorId, aulasSemanais: aulas, permiteGeminada, maximoAulasDia: permiteGeminada ? maximoAulasDia : 1 }
            : m
        )
      );
      setEditandoId(null);
    } else {
      const novo: MatrizCurricularItem = {
        id: `matriz-${crypto.randomUUID()}`,
        turmaId,
        disciplinaId,
        professorId,
        aulasSemanais: aulas,
        permiteGeminada,
        maximoAulasDia: permiteGeminada ? maximoAulasDia : 1,
      };
      onChange([...matriz, novo]);
    }
  };

  const iniciarEdicao = (m: MatrizCurricularItem) => {
    setEditandoId(m.id);
    setTurmaId(m.turmaId);
    setDisciplinaId(m.disciplinaId);
    setProfessorId(m.professorId);
    setAulasSemanais(String(m.aulasSemanais));
    setPermiteGeminada(m.permiteGeminada);
    setMaximoAulasDia(m.maximoAulasDia);
  };

  const removerItem = (id: string) => {
    onChange(matriz.filter((m) => m.id !== id));
  };

  const matrizFiltrada =
    turmaFiltro === 'todas' ? matriz : matriz.filter((m) => m.turmaId === turmaFiltro);

  // Calcular carga total de uma turma
  const getCargaTurma = (tId: string) => {
    return matriz
      .filter((m) => m.turmaId === tId)
      .reduce((acc, m) => acc + m.aulasSemanais, 0);
  };

  const getCapacidadeTurma = (tId: string) => {
    const t = turmas.find((item) => item.id === tId);
    const turno = turnos.find((tu) => tu.id === t?.turnoId);
    return (turno?.temposCount || 5) * diasLetivos.length;
  };

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-[#7e9a72] pb-4">
        <h2 className="text-3xl font-black text-[#141c12] flex items-center gap-2">
          <TableProperties className="w-8 h-8 text-[#141c12]" /> Matriz Curricular & Atribuição de Aulas
        </h2>
        <p className="text-[#283824] text-lg font-bold">
          Vincule qual professor leciona qual disciplina em cada turma, e a quantidade de aulas semanais.
        </p>
      </div>

      {/* Formulário de Atribuição */}
      <form
        onSubmit={salvarItem}
        className="bg-[#fff8e4] border-2 border-[#a2bc97] rounded-xl p-6 shadow-md space-y-4"
      >
        <h3 className="text-xl font-black text-[#141c12] mb-2">
          {editandoId ? '✏️ Editar Atribuição de Aulas' : '➕ Adicionar Atribuição à Matriz'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="matrizview-field-1">Turma:</label>
            <select id="matrizview-field-1"
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2.5 text-lg text-[#141c12] font-bold focus:border-[#141c12]"
            >
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.sigla})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="matrizview-field-2">Disciplina:</label>
            <select id="matrizview-field-2"
              value={disciplinaId}
              onChange={(e) => setDisciplinaId(e.target.value)}
              className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2.5 text-lg text-[#141c12] font-bold focus:border-[#141c12]"
            >
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome} ({d.sigla})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="matrizview-field-3">
              Professor Responsável:
            </label>
            <select id="matrizview-field-3"
              value={professorId}
              onChange={(e) => setProfessorId(e.target.value)}
              className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2.5 text-lg text-[#141c12] font-bold focus:border-[#141c12]"
            >
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.sigla})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="matrizview-field-4">
              Aulas Semanais:
            </label>
            <input id="matrizview-field-4"
              type="number" min={1} max={60} required
              value={aulasSemanais}
              onChange={(e) => setAulasSemanais(e.target.value)}
              className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2 text-lg text-[#141c12] font-bold focus:border-[#141c12]"
              placeholder="Ex: 4"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="permiteGeminada"
              checked={permiteGeminada}
              onChange={(e) => setPermiteGeminada(e.target.checked)}
              className="w-6 h-6 text-[#141c12] bg-[#ffffff] border-2 border-[#a2bc97] rounded cursor-pointer accent-[#141c12]"
            />
            <label htmlFor="permiteGeminada" className="text-[#141c12] text-lg font-bold cursor-pointer">
              Permitir aulas geminadas (blocos de 2 aulas seguidas no mesmo dia)
            </label>
          </div>

          <label className="block font-bold">Máximo de aulas da atribuição por dia
            <input type="number" min={1} max={10} required disabled={!permiteGeminada} value={permiteGeminada?maximoAulasDia:1} onChange={e=>setMaximoAulasDia(Number(e.target.value))} className="ml-3 border-2 p-2 w-20" />
          </label>
          <div className="md:col-span-2 flex justify-end gap-3 items-end">
            <button
              type="submit"
              className="px-6 py-3 bg-[#141c12] hover:bg-[#283824] text-[#fbe5ac] font-black rounded-lg shadow transition-all text-lg flex items-center gap-2 border-2 border-[#141c12]"
            >
              <Plus className="w-6 h-6 text-[#fbe5ac]" /> {editandoId ? 'Atualizar Atribuição' : 'Adicionar à Matriz'}
            </button>
            {editandoId && (
              <button
                type="button"
                onClick={() => setEditandoId(null)}
                className="px-5 py-3 bg-[#a2bc97] hover:bg-[#8fae83] text-[#141c12] font-bold rounded-lg text-lg border-2 border-[#7e9a72]"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Filtro por Turma e Indicador de Capacidade */}
      <div className="flex items-center justify-between bg-[#fff8e4] p-4 rounded-xl border-2 border-[#a2bc97] shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-black text-[#141c12] text-lg">Filtrar por Turma:</span>
          <select
            value={turmaFiltro}
            onChange={(e) => setTurmaFiltro(e.target.value)}
            className="bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2 text-lg text-[#141c12] font-bold"
          >
            <option value="todas">Todas as Turmas ({turmas.length})</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} ({getCargaTurma(t.id)}/{getCapacidadeTurma(t.id)} aulas)
              </option>
            ))}
          </select>
        </div>

        {turmaFiltro !== 'todas' && (
          <div className="flex items-center gap-2 text-lg">
            {getCargaTurma(turmaFiltro) === getCapacidadeTurma(turmaFiltro) ? (
              <span className="text-[#141c12] bg-[#a2bc97] px-3 py-1 rounded-lg font-black flex items-center gap-1.5 border border-[#7e9a72]">
                <CheckCircle className="w-6 h-6 text-[#141c12]" /> Carga Horária Completa ({getCargaTurma(turmaFiltro)}/
                {getCapacidadeTurma(turmaFiltro)})
              </span>
            ) : getCargaTurma(turmaFiltro) > getCapacidadeTurma(turmaFiltro) ? (
              <span className="text-rose-950 bg-rose-200 px-3 py-1 rounded-lg font-black flex items-center gap-1.5 border border-rose-400">
                <AlertTriangle className="w-6 h-6 text-rose-700" /> Carga Ultrapassa o Turno ({getCargaTurma(turmaFiltro)}/
                {getCapacidadeTurma(turmaFiltro)})
              </span>
            ) : (
              <span className="text-amber-950 bg-amber-200 px-3 py-1 rounded-lg font-black flex items-center gap-1.5 border border-amber-400">
                <AlertTriangle className="w-6 h-6 text-amber-700" /> Faltam {getCapacidadeTurma(turmaFiltro) - getCargaTurma(turmaFiltro)} aulas para fechar a semana
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabela da Matriz */}
      <div className="bg-[#fff8e4] border-2 border-[#a2bc97] rounded-xl overflow-hidden shadow-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#a2bc97] text-[#141c12] text-lg font-black border-b-2 border-[#7e9a72]">
              <th className="p-4">Turma</th>
              <th className="p-4">Disciplina</th>
              <th className="p-4">Professor</th>
              <th className="p-4 text-center">Aulas / Semana</th>
              <th className="p-4 text-center">Geminadas?</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-[#ecd293] text-base">
            {matrizFiltrada.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#283824] font-bold text-lg">
                  Nenhuma atribuição curricular cadastrada para esta turma.
                </td>
              </tr>
            ) : (
              matrizFiltrada.map((item) => {
                const turma = turmas.find((t) => t.id === item.turmaId);
                const disc = disciplinas.find((d) => d.id === item.disciplinaId);
                const prof = professores.find((p) => p.id === item.professorId);

                return (
                  <tr key={item.id} className="hover:bg-[#fbe5ac]/50">
                    <td className="p-4 font-black text-[#141c12] text-lg">{turma?.nome}</td>
                    <td className="p-4 font-black text-[#141c12] text-lg flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-[#141c12]"
                        style={{ backgroundColor: disc?.corHex || '#2563eb' }}
                      />
                      {disc?.nome}
                    </td>
                    <td className="p-4 text-[#141c12] font-bold text-lg">
                      {prof?.nome} <span className="text-[#283824] font-mono text-sm">({prof?.sigla})</span>
                    </td>
                    <td className="p-4 text-center font-black text-[#141c12] text-2xl">
                      {item.aulasSemanais}
                    </td>
                    <td className="p-4 text-center text-[#141c12]">
                      {item.permiteGeminada ? (
                        <span className="px-3 py-1 bg-[#a2bc97] text-[#141c12] border-2 border-[#7e9a72] rounded-full text-sm font-black">
                          Permitido
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-[#ecd293] text-[#141c12] border border-[#a2bc97] rounded-full text-sm font-bold">
                          Apenas Avulsas
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => iniciarEdicao(item)}
                        className="p-2 text-[#141c12] hover:bg-[#a2bc97] rounded-lg transition-colors inline-flex border border-[#a2bc97]"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => removerItem(item.id)}
                        className="p-2 text-rose-700 hover:text-rose-900 hover:bg-[#fbe5ac] rounded-lg transition-colors inline-flex border border-rose-300"
                        title="Remover"
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
    </div>
  );
};
