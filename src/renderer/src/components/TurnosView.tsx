import React, { useState } from 'react';
import { minutos, janelaTempo } from '../../../shared/rules';
import { Turno } from '../../../shared/types';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Calendar,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Props {
  turnos: Turno[];
  onChange: (turnos: Turno[]) => void;
}

// Helper para calcular a grade de horários detalhada de um turno
function calcularGradeHoraria(
  horaInicio: string,
  duracaoAula: number,
  temposCount: number,
  intervaloApos: number,
  duracaoIntervalo: number
) {
  let totalMinutos: number;
  try {totalMinutos=minutos(horaInicio);} catch {return {grade:[],horaTermino:'Horário inválido'};}

  const formatHora = (mins: number) => {
    const hh = String(Math.floor(mins / 60) % 24).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const lista: { tipo: 'aula' | 'intervalo'; numero?: number; inicio: string; fim: string }[] = [];

  for (let i = 1; i <= temposCount; i++) {
    const inicioAula = formatHora(totalMinutos);
    totalMinutos += duracaoAula;
    const fimAula = formatHora(totalMinutos);

    lista.push({
      tipo: 'aula',
      numero: i,
      inicio: inicioAula,
      fim: fimAula,
    });

    if (i === intervaloApos && duracaoIntervalo > 0) {
      const inicioInt = fimAula;
      totalMinutos += duracaoIntervalo;
      const fimInt = formatHora(totalMinutos);
      lista.push({
        tipo: 'intervalo',
        inicio: inicioInt,
        fim: fimInt,
      });
    }
  }

  const horaTermino = lista.length > 0 ? lista[lista.length - 1].fim : horaInicio;

  return { grade: lista, horaTermino };
}

export const TurnosView: React.FC<Props> = ({ turnos, onChange }) => {
  // Modal de Criação / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [turnoEmEdicaoId, setTurnoEmEdicaoId] = useState<string | null>(null);

  // Estados locais do formulário (como strings para permitir apagar livremente com Backspace sem forçar zero)
  const [draftNome, setDraftNome] = useState('Matutino');
  const [draftHoraInicio, setDraftHoraInicio] = useState('07:30');
  const [draftDuracaoAula, setDraftDuracaoAula] = useState('50');
  const [draftTemposCount, setDraftTemposCount] = useState('5');
  const [draftIntervaloApos, setDraftIntervaloApos] = useState('3');
  const [draftDuracaoIntervalo, setDraftDuracaoIntervalo] = useState('20');
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Estado para expandir detalhes de horários por turno
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  // Modal de Exclusão
  const [turnoParaExcluir, setTurnoParaExcluir] = useState<Turno | null>(null);

  // Abrir Modal para Criar Novo Turno
  const abrirModalNovo = () => {
    setTurnoEmEdicaoId(null);
    setDraftNome('Vespertino');
    setDraftHoraInicio('13:00');
    setDraftDuracaoAula('50');
    setDraftTemposCount('5');
    setDraftIntervaloApos('3');
    setDraftDuracaoIntervalo('20');
    setErroValidacao(null);
    setModalAberto(true);
  };

  // Abrir Modal para Editar Turno Existente
  const abrirModalEditar = (turno: Turno) => {
    setTurnoEmEdicaoId(turno.id);
    setDraftNome(turno.nome);
    setDraftHoraInicio(turno.horaInicio);
    setDraftDuracaoAula(String(turno.duracaoAulaMinutos));
    setDraftTemposCount(String(turno.temposCount));
    setDraftIntervaloApos(String(turno.intervaloAposTempo));
    setDraftDuracaoIntervalo(String(turno.duracaoIntervaloMinutos));
    setErroValidacao(null);
    setModalAberto(true);
  };

  // Aplicar Pré-definições Rápidas
  const aplicarPredefinicao = (tipo: 'manha' | 'tarde' | 'noite' | 'integral') => {
    if (tipo === 'manha') {
      setDraftNome('Matutino');
      setDraftHoraInicio('07:30');
      setDraftDuracaoAula('50');
      setDraftTemposCount('5');
      setDraftIntervaloApos('3');
      setDraftDuracaoIntervalo('20');
    } else if (tipo === 'tarde') {
      setDraftNome('Vespertino');
      setDraftHoraInicio('13:00');
      setDraftDuracaoAula('50');
      setDraftTemposCount('5');
      setDraftIntervaloApos('3');
      setDraftDuracaoIntervalo('20');
    } else if (tipo === 'noite') {
      setDraftNome('Noturno');
      setDraftHoraInicio('18:30');
      setDraftDuracaoAula('45');
      setDraftTemposCount('4');
      setDraftIntervaloApos('2');
      setDraftDuracaoIntervalo('15');
    } else if (tipo === 'integral') {
      setDraftNome('Integral');
      setDraftHoraInicio('07:30');
      setDraftDuracaoAula('50');
      setDraftTemposCount('7');
      setDraftIntervaloApos('4');
      setDraftDuracaoIntervalo('40');
    }
  };

  // Salvar Criação ou Edição
  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();

    const nomeFinal = draftNome.trim();
    if (!nomeFinal) {
      setErroValidacao('Por favor, informe o nome do turno.');
      return;
    }

    try {minutos(draftHoraInicio);}catch(error){setErroValidacao(error instanceof Error?error.message:'Horário inválido.');return;}
    const duracao = Number(draftDuracaoAula);
    const tempos = Number(draftTemposCount);
    const intervaloApos = Number(draftIntervaloApos);
    const duracaoIntervalo = Number(draftDuracaoIntervalo);

    if (!Number.isInteger(tempos) || tempos < 1 || tempos > 10) {
      setErroValidacao('O número de aulas por dia deve ser entre 1 e 10.');
      return;
    }

    if (!Number.isInteger(duracao) || duracao < 20 || duracao > 120) {
      setErroValidacao('A duração de cada aula deve ser entre 20 e 120 minutos.');
      return;
    }

    if(!Number.isInteger(intervaloApos)||intervaloApos<0||intervaloApos>tempos||!Number.isInteger(duracaoIntervalo)||duracaoIntervalo<0||duracaoIntervalo>240){setErroValidacao('Intervalo inválido: indique um tempo existente (ou 0) e duração entre 0 e 240 minutos.');return;}
    if(janelaTempo({horaInicio:draftHoraInicio,duracaoAulaMinutos:duracao,intervaloAposTempo:intervaloApos,duracaoIntervaloMinutos:duracaoIntervalo} as Turno,tempos).fimMin>1440){setErroValidacao('O turno não pode ultrapassar meia-noite.');return;}
    if (turnoEmEdicaoId) {
      // Atualizar existente
      onChange(
        turnos.map((t) =>
          t.id === turnoEmEdicaoId
            ? {
                ...t,
                nome: nomeFinal,
                horaInicio: draftHoraInicio.trim() || '07:30',
                duracaoAulaMinutos: duracao,
                temposCount: tempos,
                intervaloAposTempo: Math.min(intervaloApos, tempos),
                duracaoIntervaloMinutos: duracaoIntervalo,
              }
            : t
        )
      );
    } else {
      // Criar novo
      const novo: Turno = {
        id: `turno-${crypto.randomUUID()}`,
        nome: nomeFinal,
        horaInicio: draftHoraInicio.trim() || '07:30',
        duracaoAulaMinutos: duracao,
        temposCount: tempos,
        intervaloAposTempo: Math.min(intervaloApos, tempos),
        duracaoIntervaloMinutos: duracaoIntervalo,
      };
      onChange([...turnos, novo]);
    }

    setModalAberto(false);
  };

  // Confirmar Exclusão
  const handleConfirmarExclusao = () => {
    if (!turnoParaExcluir) return;

    if (turnos.length <= 1) {
      setTurnoParaExcluir(null);
      return;
    }

    onChange(turnos.filter((t) => t.id !== turnoParaExcluir.id));
    setTurnoParaExcluir(null);
  };

  // Cálculo prévio no formulário
  const previewTempos = Math.min(10,Math.max(1,Number(draftTemposCount)||1));
  const previewDuracao = Math.min(120,Math.max(20,Number(draftDuracaoAula)||20));
  const previewIntervaloApos = parseInt(draftIntervaloApos, 10) || 3;
  const previewDuracaoIntervalo = parseInt(draftDuracaoIntervalo, 10) || 0;
  const previewInfo = calcularGradeHoraria(
    draftHoraInicio,
    previewDuracao,
    previewTempos,
    previewIntervaloApos,
    previewDuracaoIntervalo
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b-4 border-[#7e9a72] pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#141c12] flex items-center gap-3">
            <Clock className="w-9 h-9 text-[#141c12]" /> Turnos e Tempos de Aula
          </h2>
          <p className="text-[#283824] text-xl font-bold mt-1">
            Defina os turnos escolares (Matutino, Vespertino, Noturno, etc.), a quantidade de aulas e os horários dos intervalos.
          </p>
        </div>
        <button
          onClick={abrirModalNovo}
          className="flex items-center gap-2 px-6 py-3.5 bg-[#141c12] hover:bg-[#283824] text-[#fbe5ac] font-black rounded-xl shadow-lg transition-all text-xl border-2 border-[#141c12] cursor-pointer"
        >
          <Plus className="w-7 h-7 text-[#fbe5ac]" /> Cadastrar Novo Turno
        </button>
      </div>

      {/* Grid de Cards de Turnos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {turnos.map((turno) => {
          const info = calcularGradeHoraria(
            turno.horaInicio,
            turno.duracaoAulaMinutos,
            turno.temposCount,
            turno.intervaloAposTempo,
            turno.duracaoIntervaloMinutos
          );
          const isExpandido = expandidoId === turno.id;

          return (
            <div
              key={turno.id}
              className="bg-[#fff8e4] border-3 border-[#a2bc97] rounded-2xl p-6 shadow-md flex flex-col justify-between hover:border-[#141c12] transition-colors"
            >
              <div>
                {/* Topo do Card */}
                <div className="flex items-center justify-between border-b-2 border-[#ecd293] pb-3 mb-4">
                  <div>
                    <h3 className="text-2xl font-black text-[#141c12] flex items-center gap-2">
                      <Calendar className="w-7 h-7 text-[#283824]" /> {turno.nome}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-[#a2bc97]/50 text-[#141c12] text-sm font-black px-2.5 py-0.5 rounded-full border border-[#7e9a72]">
                        {turno.temposCount} aulas diárias
                      </span>
                      <span className="bg-[#141c12] text-[#fbe5ac] text-sm font-black px-2.5 py-0.5 rounded-full">
                        {turno.temposCount * 5} aulas semanais
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => abrirModalEditar(turno)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-[#ffffff] hover:bg-[#a2bc97]/30 text-[#141c12] font-black text-base rounded-lg border-2 border-[#141c12] shadow-sm transition-colors cursor-pointer"
                      title="Editar dados deste turno"
                    >
                      <Edit2 className="w-5 h-5 text-[#141c12]" /> Editar
                    </button>
                    <button
                      onClick={() => setTurnoParaExcluir(turno)}
                      className="p-2 text-rose-700 hover:text-rose-900 hover:bg-rose-100 rounded-lg border-2 border-transparent hover:border-rose-400 transition-colors cursor-pointer"
                      title="Excluir turno"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Grade de Especificações */}
                <div className="grid grid-cols-2 gap-3 text-[#141c12] bg-[#ffffff] p-4 rounded-xl border-2 border-[#a2bc97] shadow-inner mb-4">
                  <div>
                    <span className="block text-sm font-bold text-[#4c6b45]">⏰ Horário de Início:</span>
                    <strong className="text-xl font-black text-[#141c12]">{turno.horaInicio}</strong>
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-[#4c6b45]">🏁 Término Previsto:</span>
                    <strong className="text-xl font-black text-[#141c12]">{info.horaTermino}</strong>
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-[#4c6b45]">⏱️ Duração da Aula:</span>
                    <strong className="text-xl font-black text-[#141c12]">
                      {turno.duracaoAulaMinutos} minutos
                    </strong>
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-[#4c6b45]">☕ Intervalo / Recreio:</span>
                    <strong className="text-xl font-black text-[#141c12]">
                      {turno.duracaoIntervaloMinutos > 0
                        ? `${turno.duracaoIntervaloMinutos} min (após ${turno.intervaloAposTempo}ª aula)`
                        : 'Sem intervalo'}
                    </strong>
                  </div>
                </div>

                {/* Grade de Tempos Detalhados (Acordeão) */}
                <div className="mt-2">
                  <button
                    onClick={() => setExpandidoId(isExpandido ? null : turno.id)}
                    className="w-full flex items-center justify-between text-left text-base font-black text-[#141c12] bg-[#a2bc97]/25 hover:bg-[#a2bc97]/40 px-3 py-2 rounded-lg border border-[#7e9a72] transition-colors cursor-pointer"
                  >
                    <span>🔍 Ver escala exata de cada aula do turno</span>
                    {isExpandido ? (
                      <ChevronUp className="w-5 h-5 text-[#141c12]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#141c12]" />
                    )}
                  </button>

                  {isExpandido && (
                    <div className="mt-3 bg-[#ffffff] p-3 rounded-xl border-2 border-[#7e9a72] space-y-1.5 shadow-inner">
                      {info.grade.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-base font-bold ${
                            item.tipo === 'intervalo'
                              ? 'bg-[#ecd293]/60 text-[#141c12] border border-[#d6b76c]'
                              : 'bg-[#fbe5ac]/30 text-[#141c12]'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {item.tipo === 'intervalo' ? (
                              <>
                                <Coffee className="w-4 h-4 text-[#8a5b16]" />
                                <span className="font-black text-[#8a5b16]">Recreio / Intervalo</span>
                              </>
                            ) : (
                              <span className="font-black">{item.numero}º Tempo de Aula</span>
                            )}
                          </span>
                          <span className="font-black text-[#141c12]">
                            {item.inicio} às {item.fim}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE TURNO COM CAMPOS LIVRES     */}
      {/* ========================================================= */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-[#141c12]/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#fff8e4] border-4 border-[#141c12] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b-2 border-[#7e9a72] pb-3">
              <h3 className="text-2xl font-black text-[#141c12] flex items-center gap-2">
                <Clock className="w-7 h-7 text-[#141c12]" />
                {turnoEmEdicaoId ? `✏️ Editar Turno: ${draftNome}` : '➕ Cadastrar Novo Turno'}
              </h3>
              <button
                onClick={() => setModalAberto(false)}
                className="p-1.5 text-[#141c12] hover:bg-[#ecd293] rounded-lg transition-colors cursor-pointer"
                title="Fechar janela"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Atalhos de Predefinição */}
            <div>
              <label className="block text-sm font-black text-[#283824] uppercase tracking-wider mb-2" htmlFor="turnosview-field-1">
                ⚡ Preenchimento Rápido com Padrões Escolares:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => aplicarPredefinicao('manha')}
                  className="px-3 py-2 bg-[#ffffff] hover:bg-[#ecd293] border-2 border-[#7e9a72] text-[#141c12] text-sm font-black rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  ☀️ Manhã (07:30)
                </button>
                <button
                  type="button"
                  onClick={() => aplicarPredefinicao('tarde')}
                  className="px-3 py-2 bg-[#ffffff] hover:bg-[#ecd293] border-2 border-[#7e9a72] text-[#141c12] text-sm font-black rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  🌤️ Tarde (13:00)
                </button>
                <button
                  type="button"
                  onClick={() => aplicarPredefinicao('noite')}
                  className="px-3 py-2 bg-[#ffffff] hover:bg-[#ecd293] border-2 border-[#7e9a72] text-[#141c12] text-sm font-black rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  🌙 Noite (18:30)
                </button>
                <button
                  type="button"
                  onClick={() => aplicarPredefinicao('integral')}
                  className="px-3 py-2 bg-[#ffffff] hover:bg-[#ecd293] border-2 border-[#7e9a72] text-[#141c12] text-sm font-black rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  🏫 Integral (7 tempos)
                </button>
              </div>
            </div>

            {/* Formulário com Inputs que Permitem Apagar Livremente */}
            <form onSubmit={handleSalvar} className="space-y-4">
              {erroValidacao && (
                <div className="flex items-center gap-2 p-3 bg-rose-100 border-2 border-rose-500 text-rose-900 rounded-lg font-bold text-base">
                  <AlertCircle className="w-6 h-6 shrink-0 text-rose-600" />
                  <span>{erroValidacao}</span>
                </div>
              )}

              {/* Nome do Turno */}
              <div>
                <label className="block text-[#141c12] font-black mb-1 text-lg">
                  Nome do Turno (Ex: Matutino, Vespertino, Noturno):
                </label>
                <input id="turnosview-field-1"
                  type="text"
                  required
                  value={draftNome}
                  onChange={(e) => setDraftNome(e.target.value)}
                  className="w-full bg-[#ffffff] border-3 border-[#141c12] rounded-xl px-4 py-3 text-xl font-black text-[#141c12] focus:outline-none focus:ring-4 focus:ring-[#7e9a72]/50 shadow-inner"
                  placeholder="Ex: Matutino"
                />
              </div>

              {/* Grid de Horários e Quantidades */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Horário de Início */}
                <div>
                  <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="turnosview-field-2">
                    Horário de Início (HH:MM):
                  </label>
                  <input id="turnosview-field-2"
                    type="text"
                    required
                    value={draftHoraInicio}
                    onChange={(e) => setDraftHoraInicio(e.target.value)}
                    className="w-full bg-[#ffffff] border-2 border-[#141c12] rounded-xl px-4 py-2.5 text-xl font-black text-[#141c12] focus:outline-none focus:ring-2 focus:ring-[#7e9a72]"
                    placeholder="07:30"
                  />
                  <span className="text-xs font-bold text-[#4c6b45] mt-1 block">
                    Formato 24 horas (Ex: 07:30, 13:00, 18:30)
                  </span>
                </div>

                {/* Duração da Aula */}
                <div>
                  <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="turnosview-field-3">
                    Duração da Aula (Minutos):
                  </label>
                  <input id="turnosview-field-3"
                    type="text"
                    inputMode="numeric"
                    required
                    value={draftDuracaoAula}
                    onChange={(e) => setDraftDuracaoAula(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#ffffff] border-2 border-[#141c12] rounded-xl px-4 py-2.5 text-xl font-black text-[#141c12] focus:outline-none focus:ring-2 focus:ring-[#7e9a72]"
                    placeholder="Ex: 50"
                  />
                  <span className="text-xs font-bold text-[#4c6b45] mt-1 block">
                    Pode apagar com Backspace e digitar livremente
                  </span>
                </div>

                {/* Quantidade de Aulas por Dia */}
                <div>
                  <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="turnosview-field-4">
                    Nº de Aulas por Dia (Tempos):
                  </label>
                  <input id="turnosview-field-4"
                    type="text"
                    inputMode="numeric"
                    required
                    value={draftTemposCount}
                    onChange={(e) => setDraftTemposCount(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#ffffff] border-2 border-[#141c12] rounded-xl px-4 py-2.5 text-xl font-black text-[#141c12] focus:outline-none focus:ring-2 focus:ring-[#7e9a72]"
                    placeholder="Ex: 5"
                  />
                  <span className="text-xs font-bold text-[#4c6b45] mt-1 block">
                    Total: {previewTempos * 5} aulas semanais (Segunda a Sexta)
                  </span>
                </div>

                {/* Intervalo após qual aula */}
                <div>
                  <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="turnosview-field-5">
                    Recreio após qual tempo de aula?
                  </label>
                  <input id="turnosview-field-5"
                    type="text"
                    inputMode="numeric"
                    required
                    value={draftIntervaloApos}
                    onChange={(e) => setDraftIntervaloApos(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#ffffff] border-2 border-[#141c12] rounded-xl px-4 py-2.5 text-xl font-black text-[#141c12] focus:outline-none focus:ring-2 focus:ring-[#7e9a72]"
                    placeholder="Ex: 3"
                  />
                  <span className="text-xs font-bold text-[#4c6b45] mt-1 block">
                    Ex: 3 = recreio entre o 3º e 4º tempo
                  </span>
                </div>

                {/* Duração do Recreio */}
                <div className="sm:col-span-2">
                  <label className="block text-[#141c12] font-black mb-1 text-base" htmlFor="turnosview-field-6">
                    Duração do Recreio / Intervalo (Minutos):
                  </label>
                  <input id="turnosview-field-6"
                    type="text"
                    inputMode="numeric"
                    required
                    value={draftDuracaoIntervalo}
                    onChange={(e) => setDraftDuracaoIntervalo(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#ffffff] border-2 border-[#141c12] rounded-xl px-4 py-2.5 text-xl font-black text-[#141c12] focus:outline-none focus:ring-2 focus:ring-[#7e9a72]"
                    placeholder="Ex: 20 (ou 0 se não houver)"
                  />
                </div>
              </div>

              {/* Painel de Previsão em Tempo Real */}
              <div className="bg-[#a2bc97]/30 border-2 border-[#7e9a72] p-4 rounded-xl">
                <span className="block text-base font-black text-[#141c12] flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-[#283824]" /> Resumo do Horário Calculado:
                </span>
                <p className="text-lg font-bold text-[#141c12] mt-1">
                  Início às <strong className="font-black text-xl">{draftHoraInicio || '07:30'}</strong> • Saída prevista às{' '}
                  <strong className="font-black text-xl text-[#141c12]">{previewInfo.horaTermino}</strong>
                </p>
                <p className="text-sm font-bold text-[#283824] mt-0.5">
                  {previewTempos} aulas diárias de {previewDuracao} min cada
                  {previewDuracaoIntervalo > 0 ? ` + intervalo de ${previewDuracaoIntervalo} min` : ' (sem intervalo)'}.
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[#7e9a72]">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-6 py-3 bg-[#ffffff] hover:bg-[#ecd293] text-[#141c12] font-black text-lg rounded-xl border-2 border-[#141c12] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-3 bg-[#141c12] hover:bg-[#283824] text-[#fbe5ac] font-black text-lg rounded-xl border-2 border-[#141c12] shadow-md transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-6 h-6 text-[#fbe5ac]" />
                  {turnoEmEdicaoId ? 'Salvar Alterações' : 'Cadastrar Turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE TURNO                */}
      {/* ========================================================= */}
      {turnoParaExcluir && (
        <div className="fixed inset-0 z-50 bg-[#141c12]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fff8e4] border-4 border-rose-600 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertCircle className="w-9 h-9 shrink-0" />
              <h3 className="text-2xl font-black text-[#141c12]">Excluir Turno</h3>
            </div>

            {turnos.length <= 1 ? (
              <div className="space-y-4">
                <p className="text-lg font-bold text-[#141c12]">
                  Você não pode excluir o turno <strong>"{turnoParaExcluir.nome}"</strong> porque a sua instituição precisa de pelo menos um turno cadastrado.
                </p>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setTurnoParaExcluir(null)}
                    className="px-6 py-2.5 bg-[#141c12] text-[#fbe5ac] font-black text-lg rounded-xl border-2 border-[#141c12] cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-lg font-bold text-[#141c12]">
                  Tem certeza que deseja excluir o turno{' '}
                  <strong className="text-xl font-black text-rose-800">
                    "{turnoParaExcluir.nome}"
                  </strong>
                  ?
                </p>
                <p className="text-base font-bold text-amber-900 bg-amber-100 p-3 rounded-lg border border-amber-300">
                  ⚠️ Aviso: Caso existam turmas cadastradas com este turno, lembre-se de associá-las a outro turno após a exclusão.
                </p>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setTurnoParaExcluir(null)}
                    className="px-6 py-2.5 bg-[#ffffff] hover:bg-[#ecd293] text-[#141c12] font-black text-lg rounded-xl border-2 border-[#141c12] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarExclusao}
                    className="px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-lg rounded-xl border-2 border-rose-900 shadow-md transition-colors cursor-pointer"
                  >
                    Sim, Excluir Turno
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
