import React, { useState, useEffect, useRef } from 'react';
import { ProjetoHorario, SolverProgress, SolverResult, AulaAgendada } from '../../../shared/types';
import { Cpu, Play, CheckCircle2, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

interface Props {
  projeto: ProjetoHorario;
  onGradeGerada: (novaGrade: AulaAgendada[]) => void;
  onNavigateToGrade: () => void;
}

export const GeradorView: React.FC<Props> = ({ projeto, onGradeGerada, onNavigateToGrade }) => {
  const runId = useRef(0);
  const current = useRef(projeto);current.current=projeto;
  useEffect(()=>()=>{runId.current++;void window.api?.cancelarSolver();},[]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SolverProgress | null>(null);
  const [result, setResult] = useState<SolverResult | null>(null);

  useEffect(() => {
    if (window.api) {
      const unsubscribe = window.api.onSolverProgress((p) => {
        setProgress(p);
      });
      return unsubscribe;
    }
  }, []);

  const totalAulasNecessarias = projeto.matrizCurricular.reduce(
    (acc, m) => acc + m.aulasSemanais,
    0
  );

  const iniciarCalculo = async () => {
    const token=++runId.current,signature=JSON.stringify(projeto);
    setIsRunning(true);
    setResult(null);
    setProgress({
      progressoPorcento: 0,
      etapa: 'Iniciando validação e ordenação de restrições...',
      aulasAlocadas: 0,
      totalAulas: totalAulasNecessarias,
      conflitosRestantes: 0,
    });

    try {
      if (window.api) {
        const res = await window.api.executarSolver(projeto);
        if(token!==runId.current)return;
        if(signature!==JSON.stringify(current.current)){setResult({sucesso:false,status:'cancelado',grade:[],mensagem:'O projeto mudou durante o cálculo. Resultado descartado; gere novamente.',tempoGastoMs:res.tempoGastoMs||0});return;}
        if(res.erro)throw new Error(res.erro);
        setResult(res);
        if (res.sucesso) {
          onGradeGerada(res.grade);
        }
      } else {
        setResult({sucesso:false,status:'erro',grade:[],mensagem:'Execute o aplicativo desktop para usar o gerador.',tempoGastoMs:0});
      }
    } catch (err: unknown) {
      if(token!==runId.current)return;
      setResult({
        sucesso: false,
        grade: [],
        status:'erro',
        mensagem: `Erro: ${err instanceof Error?err.message:'falha no cálculo'}`,
        tempoGastoMs: 0,
      });
    } finally {
      if(token===runId.current)setIsRunning(false);
    }
  };

  const cancelarCalculo = async () => {
    if (window.api) {
      await window.api.cancelarSolver();
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-[#7e9a72] pb-4">
        <h2 className="text-3xl font-black text-[#141c12] flex items-center gap-2">
          <Cpu className="w-8 h-8 text-[#141c12]" /> Motor Gerador de Horários (Solver CSP)
        </h2>
        <p className="text-[#283824] text-lg font-bold">
          O cálculo ocorre em processo separado e pode ser interrompido. Restrições obrigatórias são verificadas antes de aceitar a grade.
        </p>
      </div>

      {/* Resumo Pré-Cálculo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#fff8e4] border-2 border-[#a2bc97] rounded-xl p-5 shadow-sm">
          <span className="text-[#283824] text-base font-bold">Total de Turmas:</span>
          <div className="text-3xl font-black text-[#141c12] mt-1">{projeto.turmas.length}</div>
        </div>

        <div className="bg-[#fff8e4] border-2 border-[#a2bc97] rounded-xl p-5 shadow-sm">
          <span className="text-[#283824] text-base font-bold">Total de Docentes:</span>
          <div className="text-3xl font-black text-[#141c12] mt-1">{projeto.professores.length}</div>
        </div>

        <div className="bg-[#fff8e4] border-2 border-[#a2bc97] rounded-xl p-5 shadow-sm">
          <span className="text-[#283824] text-base font-bold">Aulas a Alocar na Semana:</span>
          <div className="text-3xl font-black text-[#141c12] mt-1">{totalAulasNecessarias}</div>
        </div>
      </div>

      {/* Painel Central de Ação */}
      <div className="bg-[#fff8e4] border-2 border-[#a2bc97] rounded-2xl p-8 shadow-md text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <h3 className="text-3xl font-black text-[#141c12]">Pronto para Gerar a Grade?</h3>
          <p className="text-[#283824] text-lg font-bold">
            O algoritmo garantirá: zero choques de professor, respeito integral às indisponibilidades cadastradas e
            maximização de aulas geminadas.
          </p>

          <div className="flex justify-center gap-4 pt-4">
            {!isRunning ? (
              <button
                onClick={iniciarCalculo}
                disabled={totalAulasNecessarias === 0}
                className="px-8 py-4 bg-[#141c12] hover:bg-[#283824] disabled:bg-[#a2bc97]/50 text-[#fbe5ac] font-black text-xl rounded-xl shadow-lg transition-all flex items-center gap-3 border-2 border-[#141c12]"
              >
                <Play className="w-7 h-7 fill-[#fbe5ac] text-[#fbe5ac]" /> Gerar Horário Escolar
              </button>
            ) : (
              <button
                onClick={cancelarCalculo}
                className="px-8 py-4 bg-rose-700 hover:bg-rose-800 text-white font-black text-xl rounded-xl shadow-lg transition-all flex items-center gap-3 border-2 border-rose-900"
              >
                <XCircle className="w-7 h-7" /> Interromper Cálculo
              </button>
            )}
          </div>
        </div>

        {/* Barra de Progresso em Tempo Real */}
        {isRunning && progress && (
          <div className="max-w-3xl mx-auto space-y-3 pt-6 border-t-2 border-[#ecd293]">
            <div className="flex items-center justify-between text-lg font-black">
              <span className="text-[#141c12] flex items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#141c12]" /> {progress.etapa}
              </span>
              <span className="text-[#141c12] text-xl font-mono">{progress.progressoPorcento}%</span>
            </div>

            <div className="w-full bg-[#ecd293] rounded-full h-6 border-2 border-[#a2bc97] overflow-hidden">
              <div
                className="bg-[#141c12] h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress.progressoPorcento}%` }}
              />
            </div>

            <div className="text-[#283824] text-base font-bold flex justify-between">
              <span>
                Aulas alocadas: <strong className="text-[#141c12] font-black">{progress.aulasAlocadas}</strong> de{' '}
                {progress.totalAulas}
              </span>
              <span>Conflitos pendentes: {progress.conflitosRestantes}</span>
            </div>
          </div>
        )}

        {/* Card de Resultado */}
        {result && (
          <div
            className={`max-w-3xl mx-auto p-6 rounded-xl border-2 text-left space-y-4 shadow-sm ${
              result.sucesso
                ? 'bg-[#a2bc97] border-[#7e9a72] text-[#141c12]'
                : 'bg-rose-100 border-rose-400 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-3">
              {result.sucesso ? (
                <CheckCircle2 className="w-8 h-8 text-[#141c12] shrink-0" />
              ) : (
                <AlertCircle className="w-8 h-8 text-rose-700 shrink-0" />
              )}
              <div>
                <h4 className="text-2xl font-black text-[#141c12]">
                  {result.sucesso ? 'Grade Gerada com Sucesso!' : result.status === 'limite' ? 'Limite de busca atingido' : result.status === 'cancelado' ? 'Cálculo interrompido' : result.status === 'erro' ? 'Erro no cálculo' : 'Configuração sem solução'}
                </h4>
                <p className="text-base text-[#141c12] font-bold mt-1">{result.mensagem}</p>
                <span className="text-xs text-[#283824] font-mono font-bold">Tempo de cálculo: {result.tempoGastoMs}ms</span>
              </div>
            </div>

            {/* Lista de Conflitos se houver */}
            {result.conflitos && result.conflitos.length > 0 && (
              <div className="bg-[#ffffff] p-4 rounded-lg border-2 border-rose-300 space-y-2 mt-2">
                <span className="font-black text-rose-950 text-base block">O que precisa ser ajustado:</span>
                <ul className="list-disc list-inside space-y-1 text-rose-900 text-base font-bold">
                  {result.conflitos.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.sucesso && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={onNavigateToGrade}
                  className="px-6 py-3 bg-[#141c12] hover:bg-[#283824] text-[#fbe5ac] font-black text-lg rounded-xl shadow-md transition-all border-2 border-[#141c12]"
                >
                  👉 Abrir e Visualizar a Grade Completa
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
