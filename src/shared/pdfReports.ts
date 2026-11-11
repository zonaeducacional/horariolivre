import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjetoHorario } from './types';
import { exigirGradePublicavel } from './rules';
import { DIAS, tabelasProfessor } from './reports';
export function criarPdfProfessores(projeto: ProjetoHorario): jsPDF {
    exigirGradePublicavel(projeto);
    const doc = new jsPDF('portrait');
    projeto.professores.forEach((prof, index) => {
        if (index)
            doc.addPage();
        let y=18;
        const writeLines=(lines:string[],size:number)=>{doc.setFontSize(size);for(const line of lines){if(y>270){doc.addPage();y=18;}doc.text(line,14,y);y+=size*0.42;}};
        writeLines(doc.splitTextToSize(projeto.nomeEscola||'Horário escolar',180),16);
        y+=5;doc.setFontSize(11);
        const title = doc.splitTextToSize(`${prof.nome} (${prof.sigla}) - Ano ${projeto.anoLetivo} - ${projeto.gradeHorario.filter(a => a.professorId === prof.id).length} aulas semanais`, 180);
        writeLines(title,11);
        y+=5;
        const tables = tabelasProfessor(projeto, prof.id);
        if (!tables.length) {
            doc.text('Nenhuma aula atribuída a este docente.', 14, y + 8);
            y += 16;
        }
        for (const table of tables) {
            if (y > 245) {
                doc.addPage();
                y = 18;
            }
            doc.text(`Turno: ${table.turno.nome}`, 14, y + 5);
            autoTable(doc, { head: [['Tempo / Horário', ...projeto.diasLetivos.map(d => DIAS[d])]], body: table.rows, startY: y + 9, theme: 'grid', styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [20, 28, 18] } });
            y = ((doc as jsPDF & {
                lastAutoTable?: {
                    finalY: number;
                };
            }).lastAutoTable?.finalY ?? y + 40) + 10;
        }
        if (y > 245) {
            doc.addPage();
            y = 18;
        }
        doc.setFontSize(9);
        doc.text('Declaro ter recebido e estar ciente da grade de horários acima.', 14, y + 8);
        doc.text('Assinatura do docente: ___________________________________', 14, y + 20);
    });
    return doc;
}

/** Mural in A4 landscape. Column widths are measured at a legible 8pt;
 * long identifiers create horizontal panels rather than broken abbreviations. */
export function criarPdfQuadroGeral(projeto:ProjetoHorario):jsPDF {
    exigirGradePublicavel(projeto);
    const doc=new jsPDF('landscape');
    const days:Record<number,string>={1:'Segunda-feira',2:'Terça-feira',3:'Quarta-feira',4:'Quinta-feira',5:'Sexta-feira',6:'Sábado',7:'Domingo'};
    const subjects=new Map(projeto.disciplinas.map(d=>[d.id,d.sigla||d.nome]));
    const teachers=new Map(projeto.professores.map(p=>[p.id,p.sigla||p.nome]));
    const lessons=new Map(projeto.gradeHorario.map(a=>[JSON.stringify([a.turmaId,a.diaSemana,a.tempoNumero]),a]));
    let panels=0;
    for(const turno of projeto.turnos){
        const classes=projeto.turmas.filter(c=>c.turnoId===turno.id);
        if(!classes.length)continue;
        doc.setFont('helvetica','bold');doc.setFontSize(8);
        let width=6;
        for(const a of projeto.gradeHorario.filter(a=>classes.some(c=>c.id===a.turmaId)))
            width=Math.max(width,doc.getTextWidth(subjects.get(a.disciplinaId)!),doc.getTextWidth(teachers.get(a.professorId)!));
        width+=1.6;
        const usable=doc.internal.pageSize.getWidth()-28, classWidth=32;
        const perPanel=Math.floor((usable-classWidth)/width);
        if(perPanel<1)throw new Error('Uma sigla excede a largura imprimível. Reduza a sigla no cadastro antes de exportar.');
        const columns=projeto.diasLetivos.flatMap(day=>Array.from({length:turno.temposCount},(_,i)=>({day,time:i+1})));
        const count=Math.ceil(columns.length/perPanel);
        for(let offset=0;offset<columns.length;offset+=perPanel){
            if(panels++)doc.addPage();
            const panel=columns.slice(offset,offset+perPanel),part=Math.floor(offset/perPanel)+1;
            const columnWidth=(usable-classWidth)/panel.length;
            const groups:{content:string;colSpan:number}[]=[];
            for(const col of panel){
                const title=days[col.day];
                if(groups.length&&groups[groups.length-1].content===title)groups[groups.length-1].colSpan++;
                else groups.push({content:title,colSpan:1});
            }
            doc.setFontSize(13);
            const schoolLines:string[]=doc.splitTextToSize(projeto.nomeEscola||'Horário Escolar',usable);
            doc.setFontSize(10);
            const titleLines:string[]=doc.splitTextToSize(`Quadro geral - ${turno.nome} - ${projeto.anoLetivo}${count>1?` - Painel ${part}/${count}`:''}`,usable);
            const titleY=12+schoolLines.length*5.5+6;
            const tableTop=Math.max(34,titleY+titleLines.length*4.5+5);
            if(tableTop>100)throw new Error('Cabeçalho muito extenso para impressão. Revise o nome da escola e do turno.');
            autoTable(doc,{
                head:[[{content:'TURMA',rowSpan:2},...groups],panel.map(c=>`${c.time}º`)],
                body:classes.map(c=>[`${c.nome}\n(${c.sigla})`,...panel.map(col=>{
                    const a=lessons.get(JSON.stringify([c.id,col.day,col.time]));
                    return a?`${subjects.get(a.disciplinaId)}\n${teachers.get(a.professorId)}`:'-';
                })]),
                startY:tableTop,margin:{top:tableTop,bottom:14,left:14,right:14},theme:'grid',
                styles:{font:'helvetica',fontStyle:'bold',fontSize:8,cellPadding:{top:1.5,bottom:1.5,left:.8,right:.8},halign:'center',valign:'middle',overflow:'linebreak'},
                headStyles:{fillColor:[40,56,36],textColor:[255,255,255]},
                columnStyles:Object.fromEntries([ [0,{cellWidth:classWidth}],...panel.map((_,i)=>[i+1,{cellWidth:columnWidth}]) ]),
                rowPageBreak:'avoid',showHead:'everyPage',
                didDrawPage:(data)=>{
                    doc.setFont('helvetica','bold');doc.setFontSize(13);
                    doc.text(schoolLines,14,12);
                    doc.setFontSize(10);
                    doc.text(titleLines,14,titleY);
                    doc.setFontSize(8);doc.setFont('helvetica','normal');
                    doc.text(`Página ${doc.getNumberOfPages()}${data.pageNumber>1?' - Continuação':''}`,14,doc.internal.pageSize.getHeight()-7);
                },
            });
        }
    }
    return doc;
}
