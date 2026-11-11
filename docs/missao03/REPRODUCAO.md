# Reprodução das verificações

Node 22.23.3 e dependências já instaladas. Execute na raiz do projeto. Não use projetos escolares reais. Artefatos temporários e evidências ficam em `artifacts/missao03` (ignorada pelo Git).

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm exec electron-builder -- --linux AppImage --publish never
APPIMAGE_EXTRACT_AND_RUN=1 VIBELAB_E2E_EXECUTABLE='artifacts/packages/Vibe Lab Horário-1.1.0.AppImage' node --test tests/desktop.e2e.cjs
python3 scripts/check-missao03-pdfs.py
npm audit --json
```

O E2E cria perfis/arquivos fictícios isolados e desativa a rede no contexto do renderer. A última verificação exporta os quadros gerais e guarda a grade usada; o script Python confere todos os pares disciplina/docente com Poppler, independentemente dos helpers de relatório. Não é um leitor genérico de qualquer layout: verifica exatamente os três casos homologados, sem painéis adicionais.

## Benchmark comparativo

Não execute outros testes/builds/benchmarks simultaneamente. Cada amostra usa processo novo, limite de 30 s/250000 nós, mesmo Node, entradas e oráculo. A rodada completa anterior demora aproximadamente cinco minutos porque dois cenários atingem o teto em cada repetição.

```sh
node scripts/prepare-baseline-missao03.cjs
node scripts/benchmark-missao03.cjs before 5
node scripts/benchmark-missao03.cjs after 5
```

A preparação reconstrói apenas o solver/regras/tipos de `e616ce8` em uma pasta de artefatos, sem trocar a branch. Insere contadores no JS compilado sem alterar a busca. Os campos comuns contam nós, construções de domínio, retrocessos, podas, posições candidatas e posições aceitas. A diferença entre posições candidatas e aceitas indica rejeições dentro da enumeração; dias rejeitados antes de enumerar posições não entram nessa contagem. No motor novo, `setupMs`, `searchMs` e `firstSolutionMs` discriminam preparação dos índices, busca e primeira grade validada. Estes contadores não são persistidos nem enviados pela ponte IPC.

Cada amostra registra SHA-256 da entrada, status, grade validada pelo oráculo, tempo de parede, CPU acumulada e máximo RSS. O RSS é do processo Node, não a memória exclusiva do aplicativo Electron. Os casos são determinísticos; cinco repetições medem variação de execução, não cinco sementes de busca. Uma máquina compartilhada não oferece isolamento absoluto de CPU.

O script não carrega certificados. As entradas em `tests/fixtures/homologacao` são cópias byte a byte dos três arquivos `.grade` originais. O oráculo em `tests/helpers` foi preservado do trabalho de homologação e não importa código de produção.
