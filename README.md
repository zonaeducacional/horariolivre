# Vibe Lab Horário

Aplicativo desktop livre para montar horários escolares, com arquivos locais e funcionamento offline. A interface usa React/TypeScript e Electron; o gerador inteiro HiGHS/WebAssembly executa em Worker Thread, com o motor incluído nos pacotes Linux e Windows. Não requer Python nem conexão com a internet.

## Executar

Requer Node.js 22.12 ou posterior (preferencialmente uma versão LTS) e npm.

```sh
npm ci
npm run build
npm start
```

Para desenvolver o frontend e abrir a janela desktop:

```sh
npm run electron:dev
```

Alterações no processo principal/preload/solver exigem recompilação e reinício. `npm run dev` sozinho serve apenas a interface: navegador comum não possui as operações desktop de arquivos, geração e Excel.

## Dados e recuperação

- Arquivos `.grade` são JSON, sem banco SQLite e sem servidor externo.
- Projetos das versões 1.0.x e 1.1.x são aceitos se o esquema e as referências forem válidos. Importação não modifica o original.
- Grades antigas com conflitos ou carga incompleta são mantidas e sinalizadas; exportação fica bloqueada até validação ou nova geração.
- Salvar usa temporário no mesmo diretório, sincronização e substituição por rename. Em arquivos existentes, a versão anterior é preservada em `.bak`.
- Alterações externas ao arquivo aberto impedem sobrescrita normal. Use **Salvar como** para preservar as versões.
- Abrir um `.bak` coloca a cópia em recuperação e exige um novo destino para salvamento.
- Alterações não salvas exigem decisão explícita ao abrir, iniciar outro projeto ou fechar. Ctrl+S salva; Ctrl+Shift+S abre Salvar como.
- Uma cópia de recuperação é gravada no diretório de dados do Electron, em `recovery-v1.grade`, após breve debounce. Na reabertura, o aplicativo oferece restaurá-la. Ela não substitui o arquivo original nem um backup externo.
- Falhas de disco e de sincronização são apresentadas como erros; não há garantia absoluta contra defeitos físicos do armazenamento.

## Regras do gerador

São obrigatórios: disponibilidade, limites diários, carga configurada, ausência de choque de professor/sala por intervalos reais e uma aula por slot da turma. Aulas avulsas ficam em dias distintos; aulas da mesma disciplina no mesmo dia devem ser contíguas e não atravessar recreio.

Permitir geminação, preferência de horário e evitar janelas orientam a busca, sem converter uma preferência em impossibilidade absoluta. Aulas marcadas como fixas são preservadas; a tela de grade permite liberar essas fixações antes de uma nova geração.

Para comparar com a versão antiga, use cópias anteriores ou backups: ela não compreende as novas disponibilidades por turno.

Disponibilidades antigas sem turno continuam valendo para todos os turnos. Novas regras por turno podem substituí-las explicitamente. Exclusões mantêm os vínculos consistentes; mudanças relevantes marcam a grade para revalidação.

O cálculo distingue sucesso validado, impossibilidade, limite de busca, cancelamento e erro. Limite de busca não constitui prova de impossibilidade. Não há solução parcial apresentada como completa.

## Dias de trabalho e identidade dos docentes

Cadastre cada pessoa uma única vez em Professores e use esse mesmo cadastro em todas as suas disciplinas e turmas na matriz. Pessoas diferentes podem ter nomes semelhantes; use siglas distintas para facilitar a leitura. O aplicativo não junta docentes automaticamente pelo nome.

Em Professores e Disponibilidade, escolha cada turno e marque como indisponíveis todos os tempos dos dias em que a pessoa não trabalha. O limite diário soma as aulas de todos os turnos. Por exemplo, 16 aulas em quinta/sexta exigem limite diário de pelo menos 8, e um limite de 10 permite até 5 pela manhã e 5 à tarde. Uma carga de 26 aulas entre segunda e quinta exige limite diário de pelo menos 7.

O motor novo busca uma grade completa com modelo binário de posições e blocos diários contíguos. Uma solução viável é suficiente: geminação é uma preferência, sem prova de máximo nem de ausência de janelas. Os 100% só são enviados após a validação final. O teto continua em 30 segundos; problemas maiores ou incompatíveis ainda podem retornar limite ou impossibilidade.

Arquivos `.grade` existentes continuam compatíveis; não é necessário recadastrar a escola. Abra seu arquivo na versão 1.2.0 e use Gerar Horário Escolar para calcular novamente dentro do próprio aplicativo.

## Relatórios

PDF por turma, quadro geral por turno e PDF docente. O relatório docente inclui todos os turnos e tempos, com carga semanal efetivamente agendada. Excel contém quadro geral, turmas e docentes; nomes de abas são normalizados e deduplicados.

As exportações exigem grade completa e validada. Confira o documento antes de imprimir e de colher assinaturas.

## Verificações

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm audit
```

O comando `lint` verifica tipos e símbolos não utilizados; não substitui uma revisão de estilo completa. Os testes desktop usam Playwright com o Electron instalado, em modo headless, mantendo o sandbox ativo e usando diretórios temporários isolados. Não leem projetos escolares reais.

## Empacotamento local

```sh
npm run dist:linux -- --publish never
npm run dist:win -- --publish never
```

Saídas em `artifacts/packages`, preservando o diretório `release` e os AppImages anteriores. O empacotamento Windows gera instalador NSIS e executável portátil. Para gerar somente o portátil no Linux, use `npm run dist:win -- --win portable --x64 --publish never`. O instalador NSIS exige Windows ou um Wine funcional no Linux. O aplicativo Windows deve ser validado no sistema de destino. Não há publicação automática configurada.

O Electron usa sandbox, isolamento de contexto, Node desabilitado no renderer, CSP de produção, conteúdo local e IPC restrito ao frame principal autorizado. O modo de desenvolvimento autoriza apenas servidor HTTP de loopback na porta 5173.

## Downloads nas releases

O código-fonte fica no repositório; os executáveis ficam em [Releases](https://github.com/zonaeducacional/horariolivre/releases). Cada release deve oferecer o AppImage Linux x64, o `.exe` portátil Windows x64 e `SHA256SUMS.txt` para conferir os downloads.

Para publicar, execute o workflow **Atualizar binários da release** em Actions, informando a tag correspondente à versão do `package.json` (por exemplo, `v1.2.0`) e o commit do código em `source_ref`. O workflow verifica e compila nos dois sistemas, cria a release quando necessário e anexa os dois pacotes e seus hashes somente depois que ambas as compilações terminarem com sucesso. Uma nova execução substitui os arquivos de mesmo nome.

O SheetJS 0.20.3 vem do CDN oficial, com integridade registrada no lockfile. Overrides restritos de minimatch corrigem o advisory GHSA-g3hv-75wg-m249 nas ferramentas de empacotamento; não alteram as versões antigas usadas por dependências com API diferente. São cobertos pela verificação de empacotamento Linux.

## Validação antes de publicar

Use cópias de projetos reais, confirme as regras pedagógicas com a escola, impressão em papel, duração em casos grandes e funcionamento na distribuição Linux/Windows alvo. A aprovação automatizada não substitui essa homologação.
