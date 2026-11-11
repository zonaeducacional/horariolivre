import React, { useState } from 'react';
import { disponibilidade } from '../../../shared/rules';
import { Professor, DisponibilidadeProfessor, Turno, DisponibilidadeStatus } from '../../../shared/types';
import { GraduationCap, Plus, Trash2, Edit2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface Props {
  professores: Professor[];
  disponibilidades: DisponibilidadeProfessor[];
  turnos: Turno[];
  diasLetivos: number[];
  onProfessoresChange: (profs: Professor[]) => void;
  onRemoverProfessor?: (id: string) => void;
  onDisponibilidadesChange: (disps: DisponibilidadeProfessor[]) => void;
}

const DIAS_NOMES: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

export const ProfessoresView: React.FC<Props> = ({
  professores,
  disponibilidades,
  turnos,
  diasLetivos,
  onProfessoresChange,
  onRemoverProfessor,
  onDisponibilidadesChange,
}) => {
  const [professorSelecionadoId, setProfessorSelecionadoId] = useState<string>(
    professores[0]?.id || ''
  );

  // Estados do formulário de novo cadastro
  const [novoNome, setNovoNome] = useState('');
  const [novoSigla, setNovoSigla] = useState('');
  const [novoLimiteAulasDia, setNovoLimiteAulasDia] = useState<string | number>('5');
  const [novoEvitarJanelas, setNovoEvitarJanelas] = useState(true);

  // Estados do Modal de Edição
  const [professorEmEdicao, setProfessorEmEdicao] = useState<Professor | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editSigla, setEditSigla] = useState('');
  const [editLimite, setEditLimite] = useState<string | number>('5');
  const [editEvitarJanelas, setEditEvitarJanelas] = useState(true);

  // Estados do Modal de Confirmação de Exclusão
  const [professorParaExcluir, setProfessorParaExcluir] = useState<Professor | null>(null);

  const [turnoSelecionadoId,setTurnoSelecionadoId]=useState(turnos[0]?.id||'');
  const turnoSelecionado=turnos.find(t=>t.id===turnoSelecionadoId)||turnos[0];
  const maxTemposNoTurno=turnoSelecionado?.temposCount||0;
  const professorAtivo = professores.find((p) => p.id === professorSelecionadoId);

  // Cadastrar Novo Professor
  const handleCadastrarNovo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    const siglaFinal = novoSigla.trim() || novoNome.slice(0, 3).toUpperCase();
    const limiteFinal = parseInt(String(novoLimiteAulasDia), 10) || 5;
    const novo: Professor = {
      id: `prof-${crypto.randomUUID()}`,
      nome: novoNome.trim(),
      sigla: siglaFinal,
      limiteAulasDia: Math.min(Math.max(limiteFinal, 1), 10),
      evitarJanelas: novoEvitarJanelas,
    };

    onProfessoresChange([...professores, novo]);
    setProfessorSelecionadoId(novo.id);

    setNovoNome('');
    setNovoSigla('');
    setNovoLimiteAulasDia('5');
    setNovoEvitarJanelas(true);
  };

  // Abrir Modal de Edição
  const abrirModalEdicao = (p: Professor) => {
    setProfessorEmEdicao(p);
    setEditNome(p.nome);
    setEditSigla(p.sigla);
    setEditLimite(String(p.limiteAulasDia));
    setEditEvitarJanelas(p.evitarJanelas);
  };

  // Salvar Edição
  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!professorEmEdicao || !editNome.trim()) return;

    const siglaFinal = editSigla.trim() || editNome.slice(0, 3).toUpperCase();
    const limiteFinal = parseInt(String(editLimite), 10) || 5;
    const atualizado: Professor = {
      ...professorEmEdicao,
      nome: editNome.trim(),
      sigla: siglaFinal,
      limiteAulasDia: Math.min(Math.max(limiteFinal, 1), 10),
      evitarJanelas: editEvitarJanelas,
    };

    onProfessoresChange(
      professores.map((p) => (p.id === atualizado.id ? atualizado : p))
    );
    setProfessorEmEdicao(null);
  };

  // Confirmar Exclusão
  const handleConfirmarExclusao = () => {
    if (!professorParaExcluir) return;
    const id = professorParaExcluir.id;

    if (onRemoverProfessor) {
      onRemoverProfessor(id);
    } else {
      onProfessoresChange(professores.filter((p) => p.id !== id));
      onDisponibilidadesChange(disponibilidades.filter((d) => d.professorId !== id));
    }

    if (professorSelecionadoId === id) {
      const restante = professores.find((p) => p.id !== id);
      setProfessorSelecionadoId(restante?.id || '');
    }

    setProfessorParaExcluir(null);
  };

  // Gerenciamento de Disponibilidade
  const getStatusDisponibilidade = (profId: string, dia: number, tempo: number): DisponibilidadeStatus => {
    return disponibilidade({disponibilidades} as import('../../../shared/types').ProjetoHorario,profId,dia,tempo,turnoSelecionado?.id||'');
  };

  const alternarDisponibilidade = (profId: string, dia: number, tempo: number) => {
    const statusAtual = getStatusDisponibilidade(profId, dia, tempo);
    // Ciclo: 1 (Livre/Verde) -> 0 (Indisponível/Vermelho) -> 2 (Preferência/Amarelo) -> 1
    const novoStatus: DisponibilidadeStatus = statusAtual === 1 ? 0 : statusAtual === 0 ? 2 : 1;

    const outras = disponibilidades.filter(
      (d) => !(d.professorId === profId && d.turnoId === turnoSelecionado?.id && d.diaSemana === dia && d.tempoNumero === tempo)
    );

    onDisponibilidadesChange([
      ...outras,
      { professorId: profId, turnoId: turnoSelecionado?.id, diaSemana: dia, tempoNumero: tempo, status: novoStatus },
    ]);
  };

  const marcarTudo = (profId: string, status: DisponibilidadeStatus) => {
    const novas: DisponibilidadeProfessor[] = [];
    const outras = disponibilidades.filter((d) => d.professorId !== profId || d.turnoId !== turnoSelecionado?.id);

    for (const dia of diasLetivos) {
      for (let t = 1; t <= maxTemposNoTurno; t++) {
        novas.push({ professorId: profId, turnoId: turnoSelecionado?.id, diaSemana: dia, tempoNumero: t, status });
      }
    }

    onDisponibilidadesChange([...outras, ...novas]);
  };

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-[#7e9a72] pb-4">
        <h2 className="text-3xl font-black text-[#141c12] flex items-center gap-2">
          <GraduationCap className="w-8 h-8 text-[#141c12]" /> Professores e Disponibilidade
        </h2>
        <p className="text-[#283824] text-lg font-bold">
          Cadastre os docentes e defina a grade de dias e horários em que cada um pode lecionar.
        </p>
      </div>

      {/* Formulário de Cadastro de Novo Professor */}
      <form
        onSubmit={handleCadastrarNovo}
        className="bg-[#fff8e4] border-2 border-[#a2bc97] rounded-xl p-6 shadow-md space-y-4"
      >
        <h3 className="text-xl font-black text-[#141c12] mb-2 flex items-center gap-2">
          <Plus className="w-6 h-6 text-[#141c12]" /> Cadastrar Novo Professor
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="professoresview-field-1">
              Nome Completo do Docente:
            </label>
            <input id="professoresview-field-1"
              type="text"
              required
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2.5 text-lg text-[#141c12] font-black focus:border-[#141c12]"
              placeholder="Ex: Carlos Alberto da Silva"
            />
          </div>

          <div>
            <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="professoresview-field-2">
              Sigla (Ex: CAR):
            </label>
            <input id="professoresview-field-2"
              type="text"
              value={novoSigla}
              onChange={(e) => setNovoSigla(e.target.value)}
              className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2.5 text-lg text-[#141c12] font-black focus:border-[#141c12] uppercase"
              placeholder="Ex: CAR"
            />
          </div>

          <div>
            <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="professoresview-field-3">
              Limite de Aulas por Dia:
            </label>
            <input id="professoresview-field-3"
              type="text"
              inputMode="numeric"
              value={novoLimiteAulasDia}
              onChange={(e) => setNovoLimiteAulasDia(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2.5 text-lg text-[#141c12] font-black focus:border-[#141c12]"
              placeholder="Ex: 5"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="novoEvitarJanelas"
              checked={novoEvitarJanelas}
              onChange={(e) => setNovoEvitarJanelas(e.target.checked)}
              className="w-6 h-6 text-[#141c12] bg-[#ffffff] border-2 border-[#a2bc97] rounded cursor-pointer accent-[#141c12]"
            />
            <label htmlFor="novoEvitarJanelas" className="text-[#141c12] text-lg font-bold cursor-pointer">
              Priorizar horários sem janelas (preferência, sem garantia)
            </label>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="px-6 py-3 bg-[#141c12] hover:bg-[#283824] text-[#fbe5ac] font-black rounded-xl shadow-md transition-all text-lg flex items-center gap-2 border-2 border-[#141c12]"
            >
              <Plus className="w-6 h-6 text-[#fbe5ac]" /> Cadastrar Professor
            </button>
          </div>
        </div>
      </form>

      {/* Grid Principal: Lista de Professores à Esquerda + Matriz de Disponibilidade à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista de Seleção de Professores */}
        <div className="lg:col-span-5 bg-[#fff8e4] border-2 border-[#a2bc97] rounded-xl p-4 shadow-md space-y-3">
          <h3 className="text-xl font-black text-[#141c12] pb-2 border-b-2 border-[#ecd293] flex items-center justify-between">
            <span>Lista de Docentes</span>
            <span className="bg-[#a2bc97] px-2.5 py-0.5 rounded-full text-sm font-mono border border-[#7e9a72]">
              {professores.length} cadastrados
            </span>
          </h3>

          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {professores.length === 0 ? (
              <div className="text-center py-8 text-[#283824] font-bold text-base">
                Nenhum professor cadastrado ainda.
              </div>
            ) : (
              professores.map((prof) => (
                <div
                  key={prof.id}
                  onClick={() => setProfessorSelecionadoId(prof.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all space-y-3 ${
                    professorSelecionadoId === prof.id
                      ? 'bg-[#141c12] border-[#141c12] text-[#fbe5ac] shadow-lg ring-2 ring-[#a2bc97]'
                      : 'bg-[#ffffff] border-[#a2bc97] hover:bg-[#fbe5ac]/50 text-[#141c12] shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-xl leading-tight">{prof.nome}</h4>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className={`text-sm font-mono font-black px-2 py-0.5 rounded border ${
                            professorSelecionadoId === prof.id
                              ? 'bg-[#a2bc97] text-[#141c12] border-[#7e9a72]'
                              : 'bg-[#fbe5ac] text-[#141c12] border-[#ecd293]'
                          }`}
                        >
                          Sigla: {prof.sigla}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            professorSelecionadoId === prof.id ? 'text-[#fbe5ac]' : 'text-[#283824]'
                          }`}
                        >
                          Máx: {prof.limiteAulasDia} aulas/dia
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botões Grandes e Acessíveis de Ação */}
                  <div className="flex items-center gap-2 pt-2 border-t border-current/20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirModalEdicao(prof);
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg font-black text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                        professorSelecionadoId === prof.id
                          ? 'bg-[#a2bc97] hover:bg-[#8fae83] text-[#141c12] border border-[#7e9a72]'
                          : 'bg-[#141c12] hover:bg-[#283824] text-[#fbe5ac] border border-[#141c12]'
                      }`}
                      title="Editar dados deste professor"
                    >
                      <Edit2 className="w-4 h-4" /> Editar
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfessorParaExcluir(prof);
                      }}
                      className="flex-1 py-2 px-3 bg-rose-200 hover:bg-rose-300 text-rose-950 font-black rounded-lg text-sm border border-rose-400 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      title="Excluir este professor"
                    >
                      <Trash2 className="w-4 h-4 text-rose-700" /> Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Matriz de Disponibilidade Semanal do Professor Ativo */}
        <div className="lg:col-span-7 bg-[#fff8e4] border-2 border-[#a2bc97] rounded-xl p-6 shadow-md space-y-4">
          {professorAtivo ? (
            <>
              <div className="flex items-center justify-between border-b-2 border-[#ecd293] pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-black text-[#141c12] flex items-center gap-2">
                    Matriz de Disponibilidade: <span className="bg-[#a2bc97] px-2 py-0.5 rounded text-[#141c12] border border-[#7e9a72]">{professorAtivo.nome}</span>
                  </h3>
                  <p className="text-[#283824] text-sm font-bold mt-1">
                    Clique na célula para alternar: Disponível ➔ Indisponível ➔ Preferência.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => marcarTudo(professorAtivo.id, 1)}
                    className="px-3 py-1.5 bg-[#a2bc97] hover:bg-[#8fae83] text-[#141c12] font-black rounded-lg text-sm border-2 border-[#7e9a72]"
                  >
                    Liberar Todos
                  </button>
                  <button
                    onClick={() => marcarTudo(professorAtivo.id, 0)}
                    className="px-3 py-1.5 bg-rose-200 hover:bg-rose-300 text-rose-900 font-black rounded-lg text-sm border-2 border-rose-400"
                  >
                    Bloquear Todos
                  </button>
                </div>
              </div>

              <label className="block font-bold">Turno da disponibilidade
                <select value={turnoSelecionado?.id||''} onChange={e=>setTurnoSelecionadoId(e.target.value)} className="ml-3 border-2 p-2 bg-white">{turnos.map(t=><option key={t.id} value={t.id}>{t.nome} — {t.horaInicio}</option>)}</select>
              </label>
              <p className="text-sm">Regras antigas sem turno continuam aplicadas a todos os turnos até você definir uma exceção nesta tela.</p>
              {/* Tabela Interativa de Disponibilidade */}
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse border-2 border-[#a2bc97]">
                  <thead>
                    <tr className="bg-[#a2bc97] text-[#141c12]">
                      <th className="p-3 border-2 border-[#7e9a72] font-black">Tempo</th>
                      {diasLetivos.map((dia) => (
                        <th key={dia} className="p-3 border-2 border-[#7e9a72] font-black text-base">
                          {DIAS_NOMES[dia]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: maxTemposNoTurno }).map((_, idx) => {
                      const tempoNum = idx + 1;
                      return (
                        <tr key={tempoNum} className="hover:bg-[#fbe5ac]/40">
                          <td className="p-3 border-2 border-[#a2bc97] font-black text-[#141c12] bg-[#ecd293]/60">
                            {tempoNum}º Tempo
                          </td>
                          {diasLetivos.map((dia) => {
                            const status = getStatusDisponibilidade(professorAtivo.id, dia, tempoNum);
                            return (
                              <td
                                key={dia}
                                role="button" tabIndex={0} aria-label={`${DIAS_NOMES[dia]}, ${tempoNum}º tempo: ${status===0?'indisponível':status===2?'preferência':'disponível'}`}
                                onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();alternarDisponibilidade(professorAtivo.id,dia,tempoNum);}}}
                                onClick={() => alternarDisponibilidade(professorAtivo.id, dia, tempoNum)}
                                className={`p-4 border-2 border-[#a2bc97] font-black cursor-pointer select-none transition-all ${
                                  status === 1
                                    ? 'bg-[#a2bc97] hover:bg-[#8fae83] text-[#141c12]'
                                    : status === 0
                                    ? 'bg-rose-200 hover:bg-rose-300 text-rose-900'
                                    : 'bg-amber-200 hover:bg-amber-300 text-amber-950'
                                }`}
                              >
                                <div className="flex items-center justify-center gap-1.5">
                                  {status === 1 && (
                                    <>
                                      <CheckCircle2 className="w-5 h-5" /> Disponível
                                    </>
                                  )}
                                  {status === 0 && (
                                    <>
                                      <XCircle className="w-5 h-5 text-rose-700" /> Indisponível
                                    </>
                                  )}
                                  {status === 2 && (
                                    <>
                                      <AlertCircle className="w-5 h-5 text-amber-700" /> Preferência
                                    </>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legenda Explicativa */}
              <div className="flex items-center gap-6 pt-2 text-base text-[#141c12] font-bold">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-[#a2bc97] border-2 border-[#7e9a72] block"></span> Livre / Pode dar aula
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-rose-200 border-2 border-rose-400 block"></span> Ocupado em outra escola / Folga
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-amber-200 border-2 border-amber-400 block"></span> Preferência de horário
                </span>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-[#283824] font-bold text-lg">
              Selecione ou cadastre um professor para gerenciar sua disponibilidade.
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE EDIÇÃO DE PROFESSOR */}
      {professorEmEdicao && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#fff8e4] border-4 border-[#141c12] rounded-2xl p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="border-b-2 border-[#7e9a72] pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#141c12] flex items-center gap-2">
                  <Edit2 className="w-7 h-7 text-[#141c12]" /> Editar Docente
                </h3>
                <p className="text-[#283824] text-base font-bold">
                  Atualize as informações do professor abaixo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfessorEmEdicao(null)}
                className="p-2 text-[#141c12] hover:bg-[#a2bc97] rounded-lg transition-colors font-black"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <div>
                <label className="block text-[#141c12] font-black mb-1 text-base">
                  Nome Completo do Docente:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2.5 text-lg text-[#141c12] font-black focus:border-[#141c12]"
                  placeholder="Ex: Carlos Alberto da Silva"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="professoresview-field-4">
                    Sigla (Ex: CAR):
                  </label>
                  <input id="professoresview-field-4"
                    type="text"
                    value={editSigla}
                    onChange={(e) => setEditSigla(e.target.value)}
                    className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2.5 text-lg text-[#141c12] font-black focus:border-[#141c12] uppercase"
                    placeholder="Ex: CAR"
                  />
                </div>

                <div>
                  <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="professoresview-field-5">
                    Máx. Aulas/Dia:
                  </label>
                  <input id="professoresview-field-5"
                    type="text"
                    inputMode="numeric"
                    value={editLimite}
                    onChange={(e) => setEditLimite(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#ffffff] border-2 border-[#a2bc97] rounded-lg px-4 py-2.5 text-lg text-[#141c12] font-black focus:border-[#141c12]"
                    placeholder="Ex: 5"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="modalEvitarJanelas"
                  checked={editEvitarJanelas}
                  onChange={(e) => setEditEvitarJanelas(e.target.checked)}
                  className="w-6 h-6 text-[#141c12] bg-[#ffffff] border-2 border-[#a2bc97] rounded cursor-pointer accent-[#141c12]"
                />
                <label htmlFor="modalEvitarJanelas" className="text-[#141c12] text-base font-bold cursor-pointer">
                  Priorizar horários sem janelas (preferência, sem garantia)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-[#ecd293]">
                <button
                  type="button"
                  onClick={() => setProfessorEmEdicao(null)}
                  className="px-5 py-3 bg-[#a2bc97] hover:bg-[#8fae83] text-[#141c12] font-black rounded-xl text-base border-2 border-[#7e9a72]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#141c12] hover:bg-[#283824] text-[#fbe5ac] font-black rounded-xl text-base shadow-md border-2 border-[#141c12] flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5 text-[#fbe5ac]" /> Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {professorParaExcluir && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#fff8e4] border-4 border-rose-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="border-b-2 border-rose-300 pb-3">
              <h3 className="text-2xl font-black text-rose-900 flex items-center gap-2">
                <Trash2 className="w-7 h-7 text-rose-700" /> Confirmar Exclusão
              </h3>
              <p className="text-[#283824] text-base font-bold mt-1">
                Deseja realmente remover este professor do sistema?
              </p>
            </div>

            <div className="bg-[#ffffff] p-5 rounded-xl border-2 border-rose-200 space-y-2">
              <span className="text-xs uppercase font-black tracking-wider text-rose-800">Docente a excluir:</span>
              <h4 className="text-2xl font-black text-[#141c12]">{professorParaExcluir.nome}</h4>
              <span className="text-sm font-mono font-black text-[#141c12] bg-[#a2bc97]/40 px-2 py-0.5 rounded border border-[#7e9a72] inline-block">
                Sigla: {professorParaExcluir.sigla}
              </span>
              <p className="text-sm text-rose-800 font-bold mt-2 pt-2 border-t border-rose-100">
                ⚠️ As disponibilidades cadastradas e quaisquer aulas atribuídas a ele na grade serão automaticamente desvinculadas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProfessorParaExcluir(null)}
                className="px-5 py-3 bg-[#a2bc97] hover:bg-[#8fae83] text-[#141c12] font-black rounded-xl text-base border-2 border-[#7e9a72]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                className="px-6 py-3 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-xl text-base shadow-md border-2 border-rose-900 flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5 text-white" /> Sim, Excluir Docente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
