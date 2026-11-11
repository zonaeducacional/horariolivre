import React, { useState } from 'react';
import { ProjetoHorario, AulaAgendada } from '../../../shared/types';
import { corTexto } from '../../../shared/colors';
import { trocarAulas } from '../../../shared/rules';
import { tabelasProfessor, DIAS } from '../../../shared/reports';
import { Calendar, User, Users, AlertCircle, ArrowLeftRight, Building2 } from 'lucide-react';

interface Props {
  projeto: ProjetoHorario;
  onGradeChange: (novaGrade: AulaAgendada[]) => void;
}

const DIAS_NOMES: Record<number, string> = {
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

export const GradeView: React.FC<Props> = ({ projeto, onGradeChange }) => {
  const [modoVisao, setModoVisao] = useState<'turma' | 'professor' | 'geral'>('turma');
  const [turmaId, setTurmaId] = useState<string>(projeto.turmas[0]?.id || '');
  const [professorId, setProfessorId] = useState<string>(projeto.professores[0]?.id || '');
  const [turnoGeralId, setTurnoGeralId] = useState<string>(projeto.turnos[0]?.id || '');

  // Troca manual de células na visão por turma
  const [celulaOrigem, setCelulaOrigem] = useState<{ dia: number; tempo: number } | null>(null);
  const [avisoConflito, setAvisoConflito] = useState<string | null>(null);

  const turmaAtiva = projeto.turmas.find((t) => t.id === turmaId);
  const turnoAtivo = projeto.turnos.find((tu) => tu.id === turmaAtiva?.turnoId);
  const maxTempos = turnoAtivo?.temposCount || 5;

  const turnoGeralAtivo = projeto.turnos.find((tu) => tu.id === turnoGeralId) || projeto.turnos[0];
  const turmasDoTurnoGeral = projeto.turmas.filter((t) => t.turnoId === turnoGeralAtivo?.id);
  const maxTemposGeral = turnoGeralAtivo?.temposCount || 5;

  const professorAtivo = projeto.professores.find((p) => p.id === professorId);

  // Buscar aula no slot da turma
  const getAulaTurma = (tId: string, dia: number, tempo: number): AulaAgendada | undefined => {
    return projeto.gradeHorario.find(
      (a) => a.turmaId === tId && a.diaSemana === dia && a.tempoNumero === tempo
    );
  };

  // Clique em uma célula para troca manual
  const handleCelulaClick = (dia: number, tempo: number) => {
    if (modoVisao !== 'turma') return;

    if (!celulaOrigem) {
      setCelulaOrigem({ dia, tempo });
      setAvisoConflito(null);
    } else {
      if (celulaOrigem.dia === dia && celulaOrigem.tempo === tempo) {
        setCelulaOrigem(null);
        return;
      }

      try {
        onGradeChange(trocarAulas(projeto,turmaId,celulaOrigem,{dia,tempo}));
        setCelulaOrigem(null);setAvisoConflito(null);
      } catch(error) {setAvisoConflito(error instanceof Error?error.message:'Troca inválida.');}

    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Navegação e Modos */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b-4 border-[#7e9a72] pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#141c12] flex items-center gap-3">
            <Calendar className="w-9 h-9 text-[#141c12]" /> Grade Semanal de Horários
          </h2>
          <p className="text-[#283824] text-xl font-bold mt-1">
            Consulte a distribuição das aulas por turma, por professor ou no quadro geral consolidado do turno.
          </p>
        </div>

        {/* Seletor de Modo de Visão */}
        <div className="flex items-center gap-2 bg-[#fff8e4] p-1.5 rounded-xl border-3 border-[#a2bc97] shadow-sm">
          <button
            onClick={() => {
              setModoVisao('turma');
              setCelulaOrigem(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-black text-base transition-all cursor-pointer ${
              modoVisao === 'turma'
                ? 'bg-[#141c12] text-[#fbe5ac] shadow-md'
                : 'text-[#141c12] hover:bg-[#a2bc97]/40'
            }`}
          >
            <Users className="w-5 h-5" /> Por Turma
          </button>

          <button
            onClick={() => {
              setModoVisao('professor');
              setCelulaOrigem(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-black text-base transition-all cursor-pointer ${
              modoVisao === 'professor'
                ? 'bg-[#141c12] text-[#fbe5ac] shadow-md'
                : 'text-[#141c12] hover:bg-[#a2bc97]/40'
            }`}
          >
            <User className="w-5 h-5" /> Por Professor
          </button>

          <button
            onClick={() => {
              setModoVisao('geral');
              setCelulaOrigem(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-black text-base transition-all cursor-pointer ${
              modoVisao === 'geral'
                ? 'bg-[#141c12] text-[#fbe5ac] shadow-md'
                : 'text-[#141c12] hover:bg-[#a2bc97]/40'
            }`}
          >
            <Building2 className="w-5 h-5" /> Quadro Geral por Turno
          </button>
        </div>
      </div>

      <button disabled={!projeto.gradeHorario.some(a=>a.fixaManual)} onClick={()=>onGradeChange(projeto.gradeHorario.map(a=>({...a,fixaManual:false})))} className="border-2 p-2 rounded-lg disabled:opacity-50">Liberar fixações manuais para nova geração</button>
      {/* Barra de Filtro e Avisos */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#fff8e4] p-4 rounded-xl border-3 border-[#a2bc97] shadow-sm">
        <div className="flex items-center gap-3">
          {modoVisao === 'turma' && (
            <>
              <span className="font-black text-[#141c12] text-xl">Turma Selecionada:</span>
              <select
                value={turmaId}
                onChange={(e) => {
                  setTurmaId(e.target.value);
                  setCelulaOrigem(null);
                }}
                className="bg-[#ffffff] border-3 border-[#141c12] rounded-xl px-4 py-2 text-xl text-[#141c12] font-black shadow-inner"
              >
                {projeto.turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.sigla})
                  </option>
                ))}
              </select>
            </>
          )}

          {modoVisao === 'professor' && (
            <>
              <span className="font-black text-[#141c12] text-xl">Docente Selecionado:</span>
              <select
                value={professorId}
                onChange={(e) => setProfessorId(e.target.value)}
                className="bg-[#ffffff] border-3 border-[#141c12] rounded-xl px-4 py-2 text-xl text-[#141c12] font-black shadow-inner"
              >
                {projeto.professores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.sigla})
                  </option>
                ))}
              </select>
            </>
          )}

          {modoVisao === 'geral' && (
            <>
              <span className="font-black text-[#141c12] text-xl">Turno do Quadro Geral:</span>
              <select
                value={turnoGeralId}
                onChange={(e) => setTurnoGeralId(e.target.value)}
                className="bg-[#ffffff] border-3 border-[#141c12] rounded-xl px-4 py-2 text-xl text-[#141c12] font-black shadow-inner"
              >
                {projeto.turnos.map((tu) => (
                  <option key={tu.id} value={tu.id}>
                    {tu.nome} ({tu.temposCount} tempos • {tu.horaInicio})
                  </option>
                ))}
              </select>
              <span className="text-base font-bold text-[#283824] ml-2">
                ({turmasDoTurnoGeral.length} turmas vinculadas)
              </span>
            </>
          )}
        </div>

        {celulaOrigem && (
          <div className="flex items-center gap-3 bg-[#141c12] border-2 border-[#141c12] px-4 py-2 rounded-xl text-[#fbe5ac] font-black text-lg animate-pulse">
            <ArrowLeftRight className="w-6 h-6 text-[#fbe5ac]" /> Clique na célula de destino para trocar
            <button
              onClick={() => setCelulaOrigem(null)}
              className="text-sm text-[#a2bc97] underline hover:text-white ml-2 font-bold cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {avisoConflito && (
        <div className="p-4 bg-rose-100 border-3 border-rose-500 rounded-xl flex items-center gap-3 text-rose-950 text-xl font-bold">
          <AlertCircle className="w-8 h-8 text-rose-700 shrink-0" />
          <span>{avisoConflito}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISÃO 1 & 2: POR TURMA OU POR PROFESSOR                  */}
      {/* ========================================================= */}
      {modoVisao === 'turma' && (
        <div className="bg-[#fff8e4] border-3 border-[#a2bc97] rounded-2xl overflow-hidden shadow-md">
          <table className="w-full text-center border-collapse border-2 border-[#a2bc97]">
            <thead>
              <tr className="bg-[#a2bc97] text-[#141c12] text-lg border-b-2 border-[#7e9a72]">
                <th className="p-4 border-2 border-[#7e9a72] font-black w-40 text-xl">Horário / Tempo</th>
                {projeto.diasLetivos.map((dia) => (
                  <th key={dia} className="p-4 border-2 border-[#7e9a72] font-black text-xl">
                    {DIAS_NOMES[dia]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxTempos }).map((_, idx) => {
                const tempoNum = idx + 1;
                return (
                  <tr key={tempoNum} className="hover:bg-[#fbe5ac]/40">
                    <td className="p-4 border-2 border-[#a2bc97] font-black text-[#141c12] bg-[#ecd293]/70 text-xl">
                      {tempoNum}º Tempo
                    </td>
                    {projeto.diasLetivos.map((dia) => {
                      const aula =
                        getAulaTurma(turmaId, dia, tempoNum);

                      const disc = projeto.disciplinas.find((d) => d.id === aula?.disciplinaId);
                      const prof = projeto.professores.find((p) => p.id === aula?.professorId);
                      const turmaDestaque = projeto.turmas.find((t) => t.id === aula?.turmaId);

                      const isSelected =
                        celulaOrigem?.dia === dia && celulaOrigem?.tempo === tempoNum;

                      return (
                        <td
                          key={dia}
                          role="button" tabIndex={0}
                          aria-label={`${DIAS_NOMES[dia]}, ${tempoNum}º tempo; selecionar para troca`}
                          onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleCelulaClick(dia,tempoNum);}}}
                          onClick={() => handleCelulaClick(dia, tempoNum)}
                          className={`p-3 border-2 border-[#a2bc97] h-28 align-middle transition-all ${
                            modoVisao === 'turma' ? 'cursor-pointer hover:bg-[#a2bc97]/30' : ''
                          } ${isSelected ? 'ring-4 ring-[#141c12] bg-[#fbe5ac]' : ''}`}
                        >
                          {aula ? (
                            <div
                              className="h-full rounded-xl p-3 text-left shadow-sm border-2 border-[#141c12] border-l-8 flex flex-col justify-between bg-[#ffffff]"
                              style={{
                                borderLeftColor: disc?.corHex || '#2563eb',
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <span className="font-black text-[#141c12] text-xl leading-tight">
                                  {disc?.nome}
                                </span>
                                <span
                                  className="text-xs px-2.5 py-1 rounded-md font-mono font-black text-white shadow"
                                  style={{ backgroundColor: disc?.corHex || '#2563eb', color:corTexto(disc?.corHex||'#2563eb') }}
                                >
                                  {disc?.sigla}
                                </span>
                              </div>

                              <div className="text-[#141c12] text-base font-bold flex items-center justify-between mt-2 pt-2 border-t-2 border-[#ecd293]">
                                {modoVisao === 'turma' ? (
                                  <>
                                    <span className="text-[#141c12] font-black">{prof?.nome}</span>
                                    <span className="text-xs font-mono font-black bg-[#a2bc97]/50 px-2 py-0.5 rounded text-[#141c12] border border-[#7e9a72]">
                                      {prof?.sigla}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[#141c12] font-black">{turmaDestaque?.nome}</span>
                                    <span className="text-xs font-mono font-black bg-[#a2bc97]/50 px-2 py-0.5 rounded text-[#141c12] border border-[#7e9a72]">
                                      {turmaDestaque?.sigla}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[#596e52] font-mono text-lg italic flex items-center justify-center h-full font-bold">
                              - Vago -
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modoVisao === 'professor' && <div className="space-y-4">
        <h3 className="text-xl font-bold">{professorAtivo?.nome || 'Selecione um docente'} — {projeto.gradeHorario.filter(a=>a.professorId===professorId).length} aulas semanais</h3>
        {tabelasProfessor(projeto,professorId,false).map(table=><section key={table.turno.id} className="overflow-x-auto bg-white p-3 rounded-xl"><h4 className="font-bold">{table.turno.nome}</h4><table className="w-full border-collapse"><thead><tr>{['Tempo / Horário',...projeto.diasLetivos.map(d=>DIAS[d])].map(h=><th key={h} scope="col" className="border p-2">{h}</th>)}</tr></thead><tbody>{table.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} className="border p-2">{cell}</td>)}</tr>)}</tbody></table></section>)}
      </div>}
      {/* ========================================================= */}
      {/* VISÃO 3: QUADRO GERAL POR TURNO (MATRIZ CONSOLIDADA)      */}
      {/* ========================================================= */}
      {modoVisao === 'geral' && (
        <div className="bg-[#fff8e4] border-3 border-[#a2bc97] rounded-2xl overflow-hidden shadow-md">
          {turmasDoTurnoGeral.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <Building2 className="w-16 h-16 text-[#7e9a72] mx-auto" />
              <h4 className="text-2xl font-black text-[#141c12]">
                Nenhuma turma cadastrada no turno {turnoGeralAtivo?.nome}
              </h4>
              <p className="text-lg font-bold text-[#283824]">
                Acesse a aba <strong>Turmas</strong> para vincular suas turmas a este turno.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse border-2 border-[#a2bc97] text-sm">
                <thead>
                  {/* Linha 1 do cabeçalho: Dias da Semana */}
                  <tr className="bg-[#a2bc97] text-[#141c12] border-b-2 border-[#7e9a72]">
                    <th rowSpan={2} className="p-3 border-2 border-[#7e9a72] font-black text-lg w-44 bg-[#8fae83]">
                      Turma
                    </th>
                    {projeto.diasLetivos.map((dia) => (
                      <th
                        key={dia}
                        colSpan={maxTemposGeral}
                        className="p-2.5 border-2 border-[#7e9a72] font-black text-lg bg-[#a2bc97]"
                      >
                        {DIAS_NOMES[dia]}
                      </th>
                    ))}
                  </tr>
                  {/* Linha 2 do cabeçalho: Tempos de cada dia */}
                  <tr className="bg-[#ecd293] text-[#141c12] text-xs font-black border-b-2 border-[#7e9a72]">
                    {projeto.diasLetivos.map((dia) =>
                      Array.from({ length: maxTemposGeral }).map((_, tIdx) => (
                        <th
                          key={`${dia}-${tIdx + 1}`}
                          className="p-1.5 border border-[#7e9a72] font-black min-w-[70px]"
                        >
                          {tIdx + 1}º
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {turmasDoTurnoGeral.map((turma) => (
                    <tr key={turma.id} className="hover:bg-[#fbe5ac]/60 border-b border-[#a2bc97]">
                      {/* Coluna da Turma */}
                      <td className="p-3 border-2 border-[#a2bc97] text-left font-black bg-[#fff8e4] sticky left-0 z-10 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full inline-block shrink-0 border border-[#141c12]"
                            style={{ backgroundColor: turma.corHex || '#3b82f6' }}
                          />
                          <span className="text-base text-[#141c12] font-black leading-tight">
                            {turma.nome}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#4c6b45] block mt-0.5">
                          Sigla: {turma.sigla}
                        </span>
                      </td>

                      {/* Células de Aulas de cada Dia e Tempo */}
                      {projeto.diasLetivos.map((dia) =>
                        Array.from({ length: maxTemposGeral }).map((_, tIdx) => {
                          const tempoNum = tIdx + 1;
                          const aula = getAulaTurma(turma.id, dia, tempoNum);
                          const disc = projeto.disciplinas.find((d) => d.id === aula?.disciplinaId);
                          const prof = projeto.professores.find((p) => p.id === aula?.professorId);

                          return (
                            <td
                              key={`${dia}-${tempoNum}`}
                              className="p-1 border border-[#ecd293] h-16 align-middle bg-[#ffffff]"
                              title={
                                aula
                                  ? `${disc?.nome || 'Disciplina'} - Prof. ${prof?.nome || 'Docente'}`
                                  : 'Vago'
                              }
                            >
                              {aula ? (
                                <div
                                  className="h-full rounded-md p-1 border-l-4 flex flex-col justify-center text-center shadow-xs bg-[#fbe5ac]/20"
                                  style={{
                                    borderLeftColor: disc?.corHex || '#2563eb',
                                  }}
                                >
                                  <strong
                                    className="font-black text-xs leading-none truncate block"
                                    style={{ color: disc?.corHex || '#141c12' }}
                                  >
                                    {disc?.sigla || disc?.nome.slice(0, 4)}
                                  </strong>
                                  <span className="text-[11px] font-bold text-[#141c12] leading-tight truncate block mt-0.5">
                                    {prof?.sigla || prof?.nome.split(' ')[0]}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[#a2bc97] text-xs font-mono">-</span>
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default GradeView;
