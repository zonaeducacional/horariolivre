import React, { useState } from 'react';
import { ProjetoHorario } from '../../../shared/types';
import jsPDF from 'jspdf';
import { exigirGradePublicavel, janelaTempo } from '../../../shared/rules';
import { hora } from '../../../shared/reports';
import { criarPdfProfessores, criarPdfQuadroGeral } from '../../../shared/pdfReports';
import autoTable from 'jspdf-autotable';
import { Printer, FileSpreadsheet, FileText, CheckCircle2, Building2 } from 'lucide-react';

interface Props {
  projeto: ProjetoHorario;
}

const DIAS_NOMES: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

export const RelatoriosView: React.FC<Props> = ({ projeto }) => {
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const exportar = (action:()=>void|Promise<void>) => async () => {
    try { exigirGradePublicavel(projeto);await action(); }
    catch(error) {setMensagemSucesso(`Exportação não realizada: ${error instanceof Error?error.message:'erro desconhecido'}`);}
  };
  // 1. Gerar PDF do Quadro Geral por Turno (Documento Oficial para Mural / Sala dos Professores)
  const gerarPdfQuadroGeralTurno = async () => {
    const doc = criarPdfQuadroGeral(projeto);
    await doc.save(`Quadro_Geral_Turnos_${projeto.anoLetivo}.pdf`,{returnPromise:true});
    setMensagemSucesso('PDF do Quadro Geral por Turno gerado e salvo com sucesso!');
  };

  // 2. Gerar PDF das Turmas (Individual por turma)
  const gerarPdfTurmas = async () => {
    const doc = new jsPDF('landscape');

    projeto.turmas.forEach((turma, index) => {
      if (index > 0) doc.addPage('landscape');

      const turno = projeto.turnos.find((t) => t.id === turma.turnoId);
      const maxTempos = turno?.temposCount || 5;

      // Cabeçalho Oficial
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(projeto.nomeEscola || 'Horário Escolar', 14, 18);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Grade Horária - Turma: ${turma.nome} (${turma.sigla}) - Turno: ${turno?.nome || ''} - Ano Letivo: ${projeto.anoLetivo}`,
        14,
        26
      );

      // Montar tabela
      const head = [['Tempo / Horário', ...projeto.diasLetivos.map((d) => DIAS_NOMES[d])]];
      const body: any[] = [];

      for (let t = 1; t <= maxTempos; t++) {
        const janela=janelaTempo(turno!,t);
        const row = [`${t}º Tempo (${hora(janela.inicioMin)}-${hora(janela.fimMin)})`];
        for (const dia of projeto.diasLetivos) {
          const aula = projeto.gradeHorario.find(
            (a) => a.turmaId === turma.id && a.diaSemana === dia && a.tempoNumero === t
          );
          if (aula) {
            const disc = projeto.disciplinas.find((d) => d.id === aula.disciplinaId)?.nome || '';
            const prof = projeto.professores.find((p) => p.id === aula.professorId)?.nome || '';
            row.push(`${disc}\n(${prof})`);
          } else {
            row.push('- Vago -');
          }
        }
        body.push(row);
      }

      autoTable(doc, {
        head,
        body,
        startY: 32,
        theme: 'grid',
        headStyles: { fillColor: [20, 28, 18], textColor: [251, 229, 172], fontSize: 11, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 6, valign: 'middle', halign: 'center' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold', fillColor: [255, 248, 228] } },
      });
    });

    await doc.save(`Horarios_Turmas_${projeto.anoLetivo}.pdf`,{returnPromise:true});
    setMensagemSucesso('PDF de Horários das Turmas gerado e salvo com sucesso!');
  };

  // 3. Gerar PDF Individual dos Professores
  const gerarPdfProfessores = async () => {
    const doc=criarPdfProfessores(projeto);
    await doc.save(`Horarios_Professores_${projeto.anoLetivo}.pdf`,{returnPromise:true});
    setMensagemSucesso('PDF completo dos docentes gerado. Confira o download antes de imprimir.');
  };

  // 4. Exportar Planilha Excel
  const exportarPlanilha = async () => {
    if (window.api) {
      const res = await window.api.exportarExcel(projeto);
      if(res.erro)throw new Error(res.erro);
      if (res.sucesso) {
        setMensagemSucesso(`Planilha Excel exportada com sucesso em: ${res.caminho}`);
      }
    } else {throw new Error('Use o aplicativo desktop para exportar Excel.');}
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="border-b-4 border-[#7e9a72] pb-4">
        <h2 className="text-3xl font-black text-[#141c12] flex items-center gap-3">
          <Printer className="w-9 h-9 text-[#141c12]" /> Relatórios e Exportação Oficial
        </h2>
        <p className="text-[#283824] text-xl font-bold mt-1">
          Gere os documentos oficiais prontos para impressão em PDF (A4 Paisagem para mural) ou planilhas Excel.
        </p>
      </div>

      {mensagemSucesso && (
        <div role="status" className="p-4 bg-[#a2bc97] border-3 border-[#141c12] rounded-2xl flex items-center gap-3 text-[#141c12] text-xl font-black shadow-md animate-in fade-in">
          <CheckCircle2 className="w-8 h-8 text-[#141c12] shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* Grid de Opções de Exportação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Destaque 1: Quadro Geral por Turno (Novo!) */}
        <div className="bg-[#fff8e4] border-3 border-[#141c12] rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-4 ring-4 ring-[#7e9a72]/30">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-[#141c12] text-[#fbe5ac] flex items-center justify-center mb-4 shadow">
              <Building2 className="w-8 h-8" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider bg-[#a2bc97]/60 text-[#141c12] px-2.5 py-1 rounded-full border border-[#7e9a72] inline-block mb-2">
              Destaque para Mural
            </span>
            <h3 className="text-2xl font-black text-[#141c12]">Quadro Geral por Turno (PDF)</h3>
            <p className="text-[#283824] text-base font-bold mt-2">
              Gera a matriz completa de todas as turmas do turno em folha A4 Paisagem. O documento oficial para a sala dos professores e coordenação.
            </p>
          </div>

          <button
            onClick={exportar(gerarPdfQuadroGeralTurno)}
            disabled={projeto.gradeHorario.length === 0}
            className="w-full py-4 bg-[#141c12] hover:bg-[#283824] disabled:bg-[#a2bc97]/40 text-[#fbe5ac] font-black rounded-xl text-lg transition-all shadow-md border-2 border-[#141c12] cursor-pointer"
          >
            Baixar Quadro Geral (PDF)
          </button>
        </div>

        {/* Opção 2: PDF de Turmas */}
        <div className="bg-[#fff8e4] border-3 border-[#a2bc97] rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-4 hover:border-[#141c12] transition-colors">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-[#a2bc97] text-[#141c12] flex items-center justify-center mb-4 border border-[#7e9a72] shadow-sm">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-[#141c12]">Grade das Turmas (PDF)</h3>
            <p className="text-[#283824] text-base font-bold mt-2">
              Gera um documento em modo paisagem com uma folha para cada turma. Ideal para fixar na porta da sala de aula e arquivo da secretaria.
            </p>
          </div>

          <button
            onClick={exportar(gerarPdfTurmas)}
            disabled={projeto.gradeHorario.length === 0}
            className="w-full py-3.5 bg-[#ffffff] hover:bg-[#ecd293] disabled:opacity-50 text-[#141c12] font-black rounded-xl text-lg transition-all shadow-sm border-2 border-[#141c12] cursor-pointer"
          >
            Baixar Grade das Turmas
          </button>
        </div>

        {/* Opção 3: PDF de Docentes com Assinatura */}
        <div className="bg-[#fff8e4] border-3 border-[#a2bc97] rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-4 hover:border-[#141c12] transition-colors">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-[#a2bc97] text-[#141c12] flex items-center justify-center mb-4 border border-[#7e9a72] shadow-sm">
              <Printer className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-[#141c12]">Horário dos Docentes (PDF)</h3>
            <p className="text-[#283824] text-base font-bold mt-2">
              Folha individual com protocolo de entrega e campo de assinatura para cada docente levar para casa.
            </p>
          </div>

          <button
            onClick={exportar(gerarPdfProfessores)}
            disabled={projeto.gradeHorario.length === 0}
            className="w-full py-3.5 bg-[#ffffff] hover:bg-[#ecd293] disabled:opacity-50 text-[#141c12] font-black rounded-xl text-lg transition-all shadow-sm border-2 border-[#141c12] cursor-pointer"
          >
            Baixar Horário dos Docentes
          </button>
        </div>

        {/* Opção 4: Excel Completo */}
        <div className="bg-[#fff8e4] border-3 border-[#a2bc97] rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-4 hover:border-[#141c12] transition-colors">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-[#a2bc97] text-[#141c12] flex items-center justify-center mb-4 border border-[#7e9a72] shadow-sm">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-[#141c12]">Planilha Geral (Excel)</h3>
            <p className="text-[#283824] text-base font-bold mt-2">
              Exporta todas as abas das turmas e o Quadro Geral por Turno no formato `.xlsx`, pronto para edição na secretaria.
            </p>
          </div>

          <button
            onClick={exportar(exportarPlanilha)}
            disabled={projeto.gradeHorario.length === 0}
            className="w-full py-3.5 bg-[#ffffff] hover:bg-[#ecd293] disabled:opacity-50 text-[#141c12] font-black rounded-xl text-lg transition-all shadow-sm border-2 border-[#141c12] cursor-pointer"
          >
            Exportar para Excel (.xlsx)
          </button>
        </div>
      </div>
    </div>
  );
};
