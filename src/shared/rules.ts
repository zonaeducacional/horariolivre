import { AulaAgendada, ProjetoHorario, Turno } from './types';
export const MAX_PROJECT_BYTES = 10 * 1024 * 1024;
export const CURRENT_VERSION = '1.1.0';
export function minutos(hora: string): number {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora))
        throw new Error('Horário inválido: use HH:MM (00:00 a 23:59).');
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}
export function janelaTempo(turno: Turno, numero: number) {
    const inicioMin = minutos(turno.horaInicio) + (numero - 1) * turno.duracaoAulaMinutos +
        (numero > turno.intervaloAposTempo && turno.intervaloAposTempo > 0 ? turno.duracaoIntervaloMinutos : 0);
    return { inicioMin, fimMin: inicioMin + turno.duracaoAulaMinutos };
}
export const sobrepoe = (a: {
    inicioMin: number;
    fimMin: number;
}, b: {
    inicioMin: number;
    fimMin: number;
}) => a.inicioMin < b.fimMin && b.inicioMin < a.fimMin;
export function disponibilidade(p: ProjetoHorario, professorId: string, dia: number, tempo: number, turnoId: string) {
    const matches = p.disponibilidades.filter(d => d.professorId === professorId && d.diaSemana === dia && d.tempoNumero === tempo);
    return (matches.find(d => d.turnoId === turnoId) ?? matches.find(d => !d.turnoId))?.status ?? 1;
}
/** Structural validation never drops or repairs records implicitly. */
export function validarEstrutura(value: unknown): asserts value is ProjetoHorario {
    const erros: string[] = [];
    const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
    if (!obj(value))
        throw new Error('Projeto inválido: o conteúdo deve ser um objeto JSON.');
    const p = value;
    const str = (v: unknown, campo: string, vazio = false) => { if (typeof v !== 'string' || (!vazio && !v.trim()) || v.length > 5000)
        erros.push(`${campo}: texto inválido.`); };
    const int = (v: unknown, campo: string, min: number, max: number) => { if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max)
        erros.push(`${campo}: inteiro entre ${min} e ${max}.`); };
    str(p.versao, 'versao');
    if (typeof p.versao === 'string' && !/^1\.(0|1)\.\d+$/.test(p.versao))
        erros.push('Versão de projeto não suportada; o arquivo original foi preservado.');
    str(p.nomeEscola, 'nomeEscola', true);
    int(p.anoLetivo, 'anoLetivo', 1900, 2200);
    str(p.ultimaModificacao, 'ultimaModificacao');
    if (typeof p.ultimaModificacao === 'string' && !Number.isFinite(Date.parse(p.ultimaModificacao)))
        erros.push('ultimaModificacao: data inválida.');
    const names = ['diasLetivos', 'turnos', 'turmas', 'professores', 'disponibilidades', 'disciplinas', 'matrizCurricular', 'gradeHorario'] as const;
    for (const name of names)
        if (!Array.isArray(p[name]) || p[name].length > 20000)
            erros.push(`${name}: lista ausente ou acima do limite de 20000 registros.`);
    if (erros.length)
        throw new Error(erros.slice(0, 30).join('\n'));
    const project = value as unknown as ProjetoHorario;
    if (!project.diasLetivos.length || new Set(project.diasLetivos).size !== project.diasLetivos.length)
        erros.push('diasLetivos: informe dias únicos.');
    project.diasLetivos.forEach(d => int(d, 'dia letivo', 1, 6));
    const ids = (list: unknown[], label: string) => {
        const seen = new Set<string>();
        for (const item of list) {
            if (!obj(item)) {
                erros.push(`${label}: registro inválido.`);
                continue;
            }
            str(item.id, `${label}.id`);
            if (typeof item.id === 'string') {
                if (seen.has(item.id))
                    erros.push(`${label}: ID duplicado ${item.id}.`);
                seen.add(item.id);
            }
        }
        return seen;
    };
    const turnos = ids(project.turnos, 'turno'), turmas = ids(project.turmas, 'turma'), profs = ids(project.professores, 'professor'), discs = ids(project.disciplinas, 'disciplina'), matriz = ids(project.matrizCurricular, 'matriz');
    ids(project.gradeHorario, 'aula');
    // Stop before accessing properties of malformed records.
    for (const name of names.filter(n => n !== 'diasLetivos'))
        if ((p[name] as unknown[]).some(v => !obj(v)))
            erros.push(`${name}: registro deve ser objeto.`);
    if (erros.length)
        throw new Error(erros.slice(0, 30).join('\n'));
    const ref = (id: string, set: Set<string>, label: string) => { if (!set.has(id))
        erros.push(`${label}: referência inexistente (${String(id)}).`); };
    for (const t of project.turnos) {
        str(t.nome, 'turno.nome');
        try {
            minutos(t.horaInicio);
        }
        catch {
            erros.push('turno.horaInicio: horário inválido.');
        }
        int(t.temposCount, 'turno.temposCount', 1, 10);
        int(t.duracaoAulaMinutos, 'turno.duracaoAulaMinutos', 20, 120);
        int(t.intervaloAposTempo, 'turno.intervaloAposTempo', 0, t.temposCount);
        int(t.duracaoIntervaloMinutos, 'turno.duracaoIntervaloMinutos', 0, 240);
        try {
            if (janelaTempo(t, t.temposCount).fimMin > 1440)
                erros.push('Turno ultrapassa meia-noite; divida-o em dias distintos.');
        }
        catch { /* reported above */ }
    }
    for (const t of project.turmas) {
        str(t.nome, 'turma.nome');
        str(t.sigla, 'turma.sigla');
        ref(t.turnoId, turnos, 'turma.turnoId');
        if (t.salaPadrao !== undefined)
            str(t.salaPadrao, 'turma.salaPadrao', true);
    }
    for (const t of project.professores) {
        str(t.nome, 'professor.nome');
        str(t.sigla, 'professor.sigla');
        int(t.limiteAulasDia, 'professor.limiteAulasDia', 1, 60);
        if (typeof t.evitarJanelas !== 'boolean')
            erros.push('professor.evitarJanelas: booleano obrigatório.');
    }
    for (const d of project.disciplinas) {
        str(d.nome, 'disciplina.nome');
        str(d.sigla, 'disciplina.sigla');
        if (typeof d.corHex !== 'string' || !/^#[\da-f]{6}$/i.test(d.corHex))
            erros.push('disciplina.corHex: cor inválida.');
    }
    for (const m of project.matrizCurricular) {
        ref(m.turmaId, turmas, 'matriz.turmaId');
        ref(m.professorId, profs, 'matriz.professorId');
        ref(m.disciplinaId, discs, 'matriz.disciplinaId');
        int(m.aulasSemanais, 'matriz.aulasSemanais', 1, 60);
        int(m.maximoAulasDia, 'matriz.maximoAulasDia', 1, 10);
        if (typeof m.permiteGeminada !== 'boolean')
            erros.push('matriz.permiteGeminada: booleano obrigatório.');
    }
    const dispKeys = new Set<string>();
    for (const d of project.disponibilidades) {
        ref(d.professorId, profs, 'disponibilidade.professorId');
        if (d.turnoId !== undefined)
            ref(d.turnoId, turnos, 'disponibilidade.turnoId');
        int(d.diaSemana, 'disponibilidade.diaSemana', 1, 6);
        int(d.tempoNumero, 'disponibilidade.tempoNumero', 1, 10);
        int(d.status, 'disponibilidade.status', 0, 2);
        const key = JSON.stringify([d.professorId, d.turnoId ?? '', d.diaSemana, d.tempoNumero]);
        if (dispKeys.has(key))
            erros.push('Disponibilidade duplicada.');
        dispKeys.add(key);
    }
    for (const a of project.gradeHorario) {
        ref(a.matrizItemId, matriz, 'aula.matrizItemId');
        ref(a.turmaId, turmas, 'aula.turmaId');
        ref(a.professorId, profs, 'aula.professorId');
        ref(a.disciplinaId, discs, 'aula.disciplinaId');
        int(a.diaSemana, 'aula.diaSemana', 1, 6);
        int(a.tempoNumero, 'aula.tempoNumero', 1, 10);
        if (typeof a.fixaManual !== 'boolean')
            erros.push('aula.fixaManual: booleano obrigatório.');
    }
    if (project.gradeDesatualizada !== undefined && typeof project.gradeDesatualizada !== 'boolean')
        erros.push('gradeDesatualizada: booleano inválido.');
    if (erros.length)
        throw new Error(erros.slice(0, 30).join('\n'));
}
export function validarGrade(p: ProjetoHorario, grade: AulaAgendada[] = p.gradeHorario, completa = false, continuidade = true): string[] {
    const errors = new Set<string>();
    const turmas = new Map(p.turmas.map(t => [t.id, t]));
    const turnos = new Map(p.turnos.map(t => [t.id, t]));
    const profs = new Map(p.professores.map(t => [t.id, t]));
    const matriz = new Map(p.matrizCurricular.map(m => [m.id, m]));
    const disciplinas=new Set(p.disciplinas.map(d=>d.id));
    const slots = new Set<string>(), ids = new Set<string>(), cargas = new Map<string, number>(), porDia = new Map<string, number>(), profDia = new Map<string, number>();
    const grupos = new Map<string, AulaAgendada[]>();
    const horarios: {
        a: AulaAgendada;
        inicioMin: number;
        fimMin: number;
        sala: string;
    }[] = [];
    for (const a of grade) {
        const m = matriz.get(a.matrizItemId), t = turmas.get(a.turmaId), turno = t && turnos.get(t.turnoId), prof = profs.get(a.professorId);
        if (!m || !t || !turno || !prof || !disciplinas.has(a.disciplinaId)) {
            errors.add('Aula com referência inexistente.');
            continue;
        }
        if (m.turmaId !== a.turmaId || m.professorId !== a.professorId || m.disciplinaId !== a.disciplinaId)
            errors.add('Aula não corresponde à atribuição da matriz curricular.');
        if (ids.has(a.id))
            errors.add('ID de aula duplicado.');
        ids.add(a.id);
        if (!p.diasLetivos.includes(a.diaSemana) || !Number.isInteger(a.tempoNumero) || a.tempoNumero < 1 || a.tempoNumero > turno.temposCount)
            errors.add('Aula fora dos dias ou tempos do turno.');
        const slot = JSON.stringify([a.turmaId, a.diaSemana, a.tempoNumero]);
        if (slots.has(slot))
            errors.add(`Duas aulas na mesma turma e horário (${t.nome}).`);
        slots.add(slot);
        if (disponibilidade(p, a.professorId, a.diaSemana, a.tempoNumero, turno.id) === 0)
            errors.add(`Professor ${prof.nome} indisponível no horário.`);
        cargas.set(m.id, (cargas.get(m.id) || 0) + 1);
        const md = JSON.stringify([m.id, a.diaSemana]);
        porDia.set(md, (porDia.get(md) || 0) + 1);
        if (porDia.get(md)! > m.maximoAulasDia)
            errors.add(`Máximo diário excedido: ${m.id}.`);
        const pd = JSON.stringify([prof.id, a.diaSemana]);
        profDia.set(pd, (profDia.get(pd) || 0) + 1);
        if (profDia.get(pd)! > prof.limiteAulasDia)
            errors.add(`Limite diário do professor ${prof.nome} excedido.`);
        const key = JSON.stringify([a.turmaId, a.disciplinaId, a.diaSemana]);
        grupos.set(key, [...(grupos.get(key) || []), a]);
        const janela = janelaTempo(turno, a.tempoNumero);
        const sala = (t.salaPadrao || '').trim().toLocaleLowerCase();
        for (const oc of horarios)
            if (oc.a.diaSemana === a.diaSemana && sobrepoe(janela, oc)) {
                if (oc.a.professorId === a.professorId)
                    errors.add(`Choque de professor: ${prof.nome}.`);
                if (sala && sala === oc.sala && oc.a.turmaId !== a.turmaId)
                    errors.add(`Choque de sala: ${t.salaPadrao}.`);
            }
        horarios.push({ a, ...janela, sala });
    }
    for (const m of p.matrizCurricular) {
        const count = cargas.get(m.id) || 0;
        if (count > m.aulasSemanais || (completa && count !== m.aulasSemanais))
            errors.add(`Carga horária divergente para ${m.id}: ${count}/${m.aulasSemanais}.`);
    }
    for (const aulas of grupos.values())
        if (aulas.length > 1) {
            const ordenadas = [...aulas].sort((a, b) => a.tempoNumero - b.tempoNumero);
            if (aulas.some(a => matriz.get(a.matrizItemId)?.permiteGeminada === false))
                errors.add('Aulas avulsas devem ocorrer em dias distintos.');
            if (continuidade) {
                const turno = turnos.get(turmas.get(aulas[0].turmaId)!.turnoId)!;
                for (let i = 1; i < ordenadas.length; i++)
                    if (janelaTempo(turno, ordenadas[i - 1].tempoNumero).fimMin !== janelaTempo(turno, ordenadas[i].tempoNumero).inicioMin)
                        errors.add('Aulas da mesma disciplina no dia devem ser contíguas e não atravessar recreio.');
            }
        }
    return [...errors];
}
export function lerProjeto(conteudo: string): {
    projeto: ProjetoHorario;
    avisos: string[];
} {
    if (new TextEncoder().encode(conteudo).length > MAX_PROJECT_BYTES)
        throw new Error('Projeto excede o limite de 10 MiB.');
    let value: unknown;
    try {
        value = JSON.parse(conteudo);
    }
    catch {
        throw new Error('Arquivo JSON corrompido ou incompleto. O original não foi alterado.');
    }
    validarEstrutura(value);
    const avisos = validarGrade(value, value.gradeHorario, true);
    return { projeto: { ...value, gradeDesatualizada: value.gradeDesatualizada || avisos.length > 0 }, avisos };
}
export function exigirGradePublicavel(p: ProjetoHorario) {
    validarEstrutura(p);
    const erros = validarGrade(p, p.gradeHorario, true);
    if (p.gradeDesatualizada)
        erros.unshift('A grade está desatualizada. Gere ou valide a grade antes de exportar.');
    if (erros.length)
        throw new Error(erros.slice(0, 20).join('\n'));
}
export function trocarAulas(p: ProjetoHorario, turmaId: string, origem: {
    dia: number;
    tempo: number;
}, destino: {
    dia: number;
    tempo: number;
}): AulaAgendada[] {
    const nova = p.gradeHorario.map(a => a.turmaId !== turmaId ? a : a.diaSemana === origem.dia && a.tempoNumero === origem.tempo ? { ...a, diaSemana: destino.dia, tempoNumero: destino.tempo, fixaManual: true } : a.diaSemana === destino.dia && a.tempoNumero === destino.tempo ? { ...a, diaSemana: origem.dia, tempoNumero: origem.tempo, fixaManual: true } : a);
    const errors = validarGrade(p, nova, true);
    if (errors.length)
        throw new Error(errors.join('\n'));
    return nova;
}
