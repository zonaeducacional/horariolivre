import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { ProjetoHorario } from '../../shared/types';
import { criarProjetoPadrao } from '../../shared/defaultProject';
import { Navbar } from './components/Navbar';
import { Sidebar, TabKey } from './components/Sidebar';
import { TurnosView } from './components/TurnosView';
import { TurmasView } from './components/TurmasView';
import { ProfessoresView } from './components/ProfessoresView';
import { DisciplinasView } from './components/DisciplinasView';
import { MatrizView } from './components/MatrizView';
import { GeradorView } from './components/GeradorView';
import { GradeView } from './components/GradeView';
const RelatoriosView=lazy(()=>import('./components/RelatoriosView').then(m=>({default:m.RelatoriosView})));
import { aplicarAlteracao } from '../../shared/projectOperations';
import { MessageNotice } from './components/MessageNotice';
import { DecisionDialog } from './components/DecisionDialog';
import { validarGrade } from '../../shared/rules';
export const App: React.FC = () => {
    const [projeto, setProjetoState] = useState<ProjetoHorario>(criarProjetoPadrao);
    const projetoRef = useRef(projeto);
    const [saved, setSaved] = useState(() => JSON.stringify(projeto));
    const [caminhoArquivo, setCaminhoArquivo] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>('turnos');
    const [pending, setPending] = useState<'new' | 'open' | 'close' | null>(null);
    const [mensagem, setMensagem] = useState('');
    const [recovery, setRecovery] = useState<ProjetoHorario | null>(null);
    const [busy, setBusy] = useState(false);
    const saving = useRef(false);
    const dirty = JSON.stringify(projeto) !== saved;
    const setProjeto = (update: ProjetoHorario | ((p: ProjetoHorario) => ProjetoHorario)) => {
        try {
            const next = aplicarAlteracao(projetoRef.current, typeof update === 'function' ? update(projetoRef.current) : update);
            const removidas=projetoRef.current.gradeHorario.length-next.gradeHorario.length;
            if(removidas>0)setMensagem(`${removidas} aula(s) vinculada(s) foram removidas com a alteração. Revise a grade antes de exportar.`);
            projetoRef.current = next;
            setProjetoState(next);
        }
        catch (error) {
            setMensagem(error instanceof Error ? error.message : 'Alteração rejeitada.');
        }
    };
    const replace = (next: ProjetoHorario, clean: boolean) => {
        projetoRef.current = next;
        setProjetoState(next);
        setSaved(clean ? JSON.stringify(next) : '');
    };
    useEffect(() => {
        const handler = (event: BeforeUnloadEvent) => { if (dirty) {
            event.preventDefault();
            event.returnValue = '';
        } };
        // Electron close is handled in the main process; beforeunload protects the web preview.
        if (!window.api)
            window.addEventListener('beforeunload', handler);
        void window.api?.marcarAlterado(dirty).catch(() => setMensagem('Não foi possível registrar o estado de salvamento.'));
        if (dirty)
            void window.api?.guardarRecuperacao(projeto).then(res => { if (res.erro)
                setMensagem(`Recuperação não gravada: ${res.erro}`); }).catch(() => setMensagem('Falha ao gravar recuperação. Salve o projeto manualmente.'));
        return () => window.removeEventListener('beforeunload', handler);
    }, [projeto, dirty]);
    useEffect(() => {
        void window.api?.recuperarProjeto().then(res => { if (res.projeto)
            setRecovery(res.projeto);
        else if (res.erro)
            setMensagem(res.erro); }).catch(() => setMensagem('Não foi possível consultar a recuperação local.'));
        return window.api?.onRecoveryError(message => setMensagem(`Falha na recuperação: ${message}. Salve manualmente.`));
    }, []);
    const handleSalvar = async (saveAs = false): Promise<boolean> => {
        if (saving.current)
            return false;
        if (!window.api) {
            setMensagem('Use o aplicativo desktop para salvar arquivos locais.');
            return false;
        }
        saving.current = true;
        setBusy(true);
        const snapshot = projetoRef.current, signature = JSON.stringify(snapshot);
        try {
            const res = await window.api.salvarProjeto(saveAs ? null : caminhoArquivo, snapshot);
            if (!res.sucesso) {
                if (res.erro)
                    setMensagem(res.erro);
                return false;
            }
            setCaminhoArquivo(res.caminho!);
            setSaved(signature);
            setMensagem('Projeto salvo. A versão anterior está no arquivo .bak quando existente.');
            return JSON.stringify(projetoRef.current) === signature;
        }
        catch (error) {
            setMensagem(error instanceof Error ? error.message : 'Falha ao salvar.');
            return false;
        }
        finally {
            saving.current = false;
            setBusy(false);
        }
    };
    const execute = async (action: 'new' | 'open' | 'close') => {
        setPending(null);
        if (action === 'close') {
            const res = await window.api?.fecharJanela();
            if (res?.erro)
                setMensagem(res.erro);
            return;
        }
        await window.api?.cancelarSolver();
        if (action === 'new') {
            replace(criarProjetoPadrao(), true);
            await window.api?.novoProjeto();
            setCaminhoArquivo(null);
            setActiveTab('turnos');
            return;
        }
        if (!window.api) {
            setMensagem('Use o aplicativo desktop para abrir projetos.');
            return;
        }
        setBusy(true);
        setMensagem('');
        try {
            const res = await window.api.abrirProjeto();
            if (res.projeto && res.sucesso) {
                replace(res.projeto, true);
                setCaminhoArquivo(res.backup ? null : res.caminho!);
                setActiveTab('grade');
                setMensagem(res.avisos?.length ? `Projeto aberto com avisos:\n${res.avisos.join('\n')}` : 'Projeto aberto.');
            }
            else if (res.erro)
                setMensagem(res.erro);
        }
        catch (error) {
            setMensagem(error instanceof Error ? error.message : 'Falha ao abrir projeto.');
        }
        finally {
            setBusy(false);
        }
    };
    const request = (action: 'new' | 'open' | 'close') => { if (saving.current)
        return; if (dirty)
        setPending(action);
    else
        void execute(action).catch(e => setMensagem(String(e))); };
    const actions = useRef<(action: 'new' | 'open' | 'save' | 'saveAs' | 'close') => void>(() => { });
    actions.current = action => { if (action === 'save' || action === 'saveAs')
        void handleSalvar(action === 'saveAs');
    else
        request(action); };
    useEffect(() => {
        const unsubscribe = window.api?.onMenu(action => actions.current(action));
        const keydown = (event: KeyboardEvent) => {
            if ((!event.ctrlKey && !event.metaKey) || event.altKey)
                return;
            const key = event.key.toLowerCase();
            const action = key === 's' ? (event.shiftKey ? 'saveAs' : 'save') : key === 'o' ? 'open' : key === 'n' ? 'new' : null;
            if (action) {
                event.preventDefault();
                actions.current(action);
            }
        };
        window.addEventListener('keydown', keydown);
        return () => { unsubscribe?.(); window.removeEventListener('keydown', keydown); };
    }, []);
    const handleNovoClick = () => request('new');
    const handleAbrir = () => request('open');
    return (<div className="flex flex-col h-screen w-screen bg-[#fbe5ac] text-[#141c12] overflow-hidden">
      {/* Barra de Navegação Superior */}
      <Navbar projeto={projeto} caminhoArquivo={caminhoArquivo} onNovo={handleNovoClick} onAbrir={handleAbrir} onSalvar={() => void handleSalvar()} onNomeEscolaChange={(nome) => setProjeto({ ...projeto, nomeEscola: nome })} onAnoLetivoChange={(ano) => setProjeto({ ...projeto, anoLetivo: ano })}/>

      {mensagem && <MessageNotice message={mensagem} onClose={() => setMensagem('')}/>}
      {dirty && <div className="px-4 py-1 font-bold" role="status">Alterações não salvas{busy ? ' — operação em andamento' : ''}</div>}
      {projeto.gradeDesatualizada && <div role="alert" className="shrink-0 px-4 py-2 bg-amber-100 max-h-[18vh] overflow-y-auto">Grade desatualizada. Os dados foram preservados; revise as restrições e gere novamente antes de exportar.<button className="ml-3 underline" onClick={() => { const erros = validarGrade(projeto, projeto.gradeHorario, true); if (erros.length)
        setMensagem(erros.join('\n'));
    else
        setProjeto(p => ({ ...p, gradeDesatualizada: false })); }}>Validar grade atual</button></div>}
      {/* Corpo com Sidebar e Conteúdo */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} aulasAlocadas={projeto.gradeHorario.length}/>

        <main className="flex-1 overflow-y-auto p-8 bg-[#fbe5ac]">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'turnos' && (<TurnosView turnos={projeto.turnos} onChange={(turnos) => setProjeto((prev) => ({ ...prev, turnos }))}/>)}

            {activeTab === 'turmas' && (<TurmasView turmas={projeto.turmas} turnos={projeto.turnos} onChange={(turmas) => setProjeto((prev) => ({ ...prev, turmas }))}/>)}

            {activeTab === 'professores' && (<ProfessoresView professores={projeto.professores} disponibilidades={projeto.disponibilidades} turnos={projeto.turnos} diasLetivos={projeto.diasLetivos} onProfessoresChange={(professores) => setProjeto((prev) => ({ ...prev, professores }))} onRemoverProfessor={(id) => {
                setProjeto((prev) => ({
                    ...prev,
                    professores: prev.professores.filter((p) => p.id !== id),
                    disponibilidades: prev.disponibilidades.filter((d) => d.professorId !== id),
                    matrizCurricular: prev.matrizCurricular.filter((m) => m.professorId !== id),
                    gradeHorario: prev.gradeHorario.filter((g) => g.professorId !== id),
                }));
            }} onDisponibilidadesChange={(disponibilidades) => setProjeto((prev) => ({ ...prev, disponibilidades }))}/>)}

            {activeTab === 'disciplinas' && (<DisciplinasView disciplinas={projeto.disciplinas} onChange={(disciplinas) => setProjeto((prev) => ({ ...prev, disciplinas }))} onRemoverDisciplina={(id) => {
                setProjeto((prev) => ({
                    ...prev,
                    disciplinas: prev.disciplinas.filter((d) => d.id !== id),
                    matrizCurricular: prev.matrizCurricular.filter((m) => m.disciplinaId !== id),
                    gradeHorario: prev.gradeHorario.filter((g) => g.disciplinaId !== id),
                }));
            }} onLimparTodas={() => {
                setProjeto((prev) => ({
                    ...prev,
                    disciplinas: [],
                    matrizCurricular: [],
                    gradeHorario: [],
                }));
            }}/>)}

            {activeTab === 'matriz' && (<MatrizView diasLetivos={projeto.diasLetivos} matriz={projeto.matrizCurricular} turmas={projeto.turmas} professores={projeto.professores} disciplinas={projeto.disciplinas} turnos={projeto.turnos} onChange={(matrizCurricular) => setProjeto((prev) => ({ ...prev, matrizCurricular }))}/>)}

            {activeTab === 'gerador' && (<GeradorView projeto={projeto} onGradeGerada={(gradeHorario) => setProjeto((prev) => ({ ...prev, gradeHorario, gradeDesatualizada: false }))} onNavigateToGrade={() => setActiveTab('grade')}/>)}

            {activeTab === 'grade' && (<GradeView projeto={projeto} onGradeChange={(gradeHorario) => setProjeto((prev) => ({ ...prev, gradeHorario, gradeDesatualizada: validarGrade(prev,gradeHorario,true).length>0 }))}/>)}

            {activeTab === 'relatorios' && <Suspense fallback={<p role="status">Carregando relatórios...</p>}><RelatoriosView projeto={projeto}/></Suspense>}
          </div>
        </main>
      </div>

      {pending && <DecisionDialog title="Alterações não salvas" onCancel={() => setPending(null)}>
        <p>Salve o trabalho atual antes de continuar, ou escolha descartá-lo explicitamente.</p>
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => setPending(null)}>Cancelar</button>
          <button disabled={busy} onClick={() => void execute(pending).catch(e => setMensagem(String(e)))}>Descartar e continuar</button>
          <button disabled={busy} onClick={() => { const action = pending; void handleSalvar().then(ok => { if (ok)
            void execute(action).catch(e => setMensagem(String(e))); }); }}>Salvar e continuar</button>
        </div>
      </DecisionDialog>}
      {recovery && <DecisionDialog title="Recuperação local disponível" onCancel={() => setRecovery(null)}>
        <p>Há uma cópia de recuperação de {recovery.nomeEscola}, registrada em {new Date(recovery.ultimaModificacao).toLocaleString('pt-BR')}. O arquivo original não será alterado.</p>
        <button onClick={() => setRecovery(null)}>Continuar sem restaurar</button>
        <button className="ml-4" onClick={() => { replace(recovery, false); setCaminhoArquivo(null); setRecovery(null); setMensagem('Cópia restaurada. Use Salvar como para escolher o destino.'); }}>Restaurar cópia</button>
      </DecisionDialog>}

    </div>);
};
export default App;
