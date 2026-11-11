# Registro de estabilização

## Referência e escopo

Fontes originais registradas no commit `d80e1ba`, após confirmar ausência de repositório Git na pasta. Branch local: `fix/estabilizacao-integral`. Sem remoto, push, merge ou publicação. A auditoria anterior foi recuperada da conversa; seus casos foram reproduzidos em testes antes das correções.

Os binários anteriores em `release` e na área de trabalho foram preservados. Os testes de disco usam apenas diretórios temporários; o empacotamento novo usa `artifacts/packages`.

## Correções por grupo da auditoria

| Achados | Implementação | Evidência automatizada |
|---|---|---|
| 01–03 | Proteção de alterações, esquema validado, salvamento atômico, backup, fingerprint e recuperação | `data.test.cjs`, `desktop.e2e.cjs` |
| 04–05 | Operações relacionadas e marcação de grade desatualizada, sem descartar dados de importação | `data.test.cjs`, `rules.test.cjs` |
| 06–12, 15, 24, 30 | Regras compartilhadas, capacidade real, avulsas, fixações, preferências, recreio, horários e disponibilidade por turno | `solver.test.cjs`, `rules.test.cjs` |
| 08–09 | Editor usa a mesma validação temporal e de integridade | `rules.test.cjs` |
| 13, 20, 23 | Relatórios completos, bloqueio de grade inválida, erros explícitos e abas válidas | `reports.test.cjs` |
| 14 | Worker cancelável, isolamento de snapshot, limite, liberação e proteção de resultado obsoleto na interface | `worker.test.cjs`, `desktop.e2e.cjs` |
| 16–19 | Electron suportado, sandbox, CSP, origem/frame IPC, navegação e caminhos restritos, dependências corrigidas | `security.test.cjs`, testes desktop e npm audit |
| 21–22 | Menus/atalhos conectados e scripts desktop corrigidos | `desktop.e2e.cjs` |
| 25–26 | Diálogo de proteção com foco/teclado, labels associados, células acessíveis por teclado e contraste de siglas | testes de contraste e desktop; leitor de tela ainda requer revisão humana |
| 27–29 | Campos de escola acessíveis em janela estreita, remoção de pacotes sem uso, relatórios sob demanda, documentação real e saída separada de pacotes | typecheck, lint de tipos, build e teste desktop |

## Limites deliberados

- Sem reescrita do aplicativo nem sincronização, PWA ou serviços externos.
- O solver mantém busca limitada; um limite não é diagnosticado como impossibilidade.
- A política contígua sem atravessar recreio segue o PRD existente. A escola deve confirmar se essa regra corresponde à prática desejada.
- Arquivos estruturalmente inválidos ou com referências inexistentes são rejeitados com erro, sem modificar o original. A recuperação por backup é oferecida; registros inválidos não são descartados silenciosamente.
- Preferências são heurísticas: não há promessa de ótimo global para janelas ou distribuição.
- A recuperação local é uma cópia do trabalho recente, não histórico ilimitado nem substituto de backup externo. O descarte explícito não elimina automaticamente a cópia de recuperação.
- Windows/macOS, leitor de tela, impressoras físicas e falha física de energia não foram homologados neste ambiente Linux.
- O override de minimatch requer nova verificação quando electron-builder atualizar sua própria dependência.

## Como reproduzir

1. `npm ci` com Node LTS >=22.12.
2. `npm run typecheck` e `npm run lint`.
3. `npm test` e `npm run test:e2e`.
4. `npm audit`.
5. `npm run dist:linux -- --publish never`.
6. Rodar a suíte desktop com `VIBELAB_E2E_EXECUTABLE` apontando para `artifacts/packages/linux-unpacked/horario-livre-desktop`.

Logs de validação e arquivos sintéticos ficam em `artifacts/validation` (ignorados pelo Git).

## Resultado final verificado

Ambiente: Linux x64, Node 22.23.3, Electron 45.3.0. Candidato local: versão 1.1.0.

| Verificação | Resultado final |
|---|---|
| Typecheck frontend e Electron | Aprovado |
| Lint de tipos e símbolos não utilizados | Aprovado |
| Testes unitários/integração | 60 aprovados, 0 falhas, 0 ignorados |
| E2E pelos fontes compilados | 11 aprovados, 0 falhas, 0 ignorados |
| E2E no pacote linux-unpacked | 11 aprovados, 0 falhas, 0 ignorados |
| E2E no AppImage (extração/execução do runtime) | 11 aprovados, 0 falhas, 0 ignorados |
| Total de execuções finais | 93 aprovadas, 0 falhas, 0 ignoradas; 71 casos distintos |
| Build de produção | Aprovado |
| Empacotamento Linux AppImage | Aprovado, publicação desabilitada |
| npm audit, incluindo dependências de desenvolvimento | 0 avisos conhecidos |
| Renderização PDF docente A4 com dois turnos | Inspecionada, incluindo sétimo tempo e assinatura |
| PDF e Excel pela interface desktop | Exportados e conferidos nos três modos E2E |
| ASAR | Main, regras, worker e index.html conferidos contra o build |

O comando de empacotamento efetivamente executado foi `npm exec electron-builder -- --linux AppImage --publish never`; não foi gerado instalador Windows nem pacote DEB. O AppImage foi testado com `APPIMAGE_EXTRACT_AND_RUN=1`, sem desativar o sandbox. Os testes verificam também ausência do switch no-sandbox.

As cinco regressões iniciais falharam antes da correção. Falhas intermediárias de interface e dos próprios harnesses foram investigadas; os resultados acima se referem à rodada final, não a uma alegação de que todas as tentativas históricas passaram.

Não executados: homologação Windows/macOS, impressoras físicas, montagem FUSE do AppImage, queda real de energia, leitor de tela completo e carga representativa de uma escola real. São verificações de homologação, não testes declarados como aprovados.

O bundle principal passou de 664865 bytes no artefato auditado para 269588 bytes no build atual, com relatórios carregados sob demanda. Isso não é uma medição de tempo de inicialização ou de consumo de memória.

Os AppImages antigos na área de trabalho e em release mantêm SHA-256 b6329efd9d368b5e12972594305d59a5ffeed85a8dc163b35aa328f46ea0c1dd. O candidato novo está em artifacts/packages/Vibe Lab Horário-1.1.0.AppImage. O empacotador ainda informa uso de ícone genérico e associação desktopName não personalizada; são pendências de apresentação/integração do desktop, sem redução de sandbox.

## Parecer

Pronto para testes reais controlados no Linux, usando cópias dos projetos e backups externos. A publicação depende de homologação pedagógica, visual e dos sistemas operacionais de destino. Preservar a versão antiga até essa aprovação. Não houve push, merge ou publicação.

## Histórico dos commits de implementação

```text
d80e1ba chore: registra fontes originais antes da estabilização
a1458b9 test: reproduz cinco falhas confirmadas do gerador
9d56541 fix: valida projetos e protege gravação com backup atômico
12401a3 fix: aplica regras temporais e valida soluções do gerador
32f8e96 fix: executa solver em worker cancelável com validação final
5bd435a fix: protege Electron e IPC e exporta relatórios completos validados
7c79352 fix: integra edição validada recuperação e proteção de alterações na interface
c93cd0e fix: cobre casos limite de recuperação origem IPC e distribuição escolar
dcaf64a test: verifica exportações nativas no desktop e AppImage
a625c62 docs: registra validação final e procedimentos seguros de operação
6933d78 fix: mantém IDs únicos ao regerar aulas fixadas manualmente
```

O histórico abaixo inclui a regressão adicional de IDs de aulas fixadas; este registro é seguido apenas pela atualização documental final.

## Arquivos de implementação e verificação alterados desde a referência

```text
.gitignore
electron-builder.yml
package-lock.json
package.json
postcss.config.js
scripts/start-electron.cjs
src/main/database.ts
src/main/excel.ts
src/main/index.ts
src/main/ipcHandlers.ts
src/main/projectFiles.ts
src/main/security.ts
src/main/solverRunner.ts
src/preload/index.ts
src/renderer/src/App.tsx
src/renderer/src/components/DecisionDialog.tsx
src/renderer/src/components/DisciplinasView.tsx
src/renderer/src/components/GeradorView.tsx
src/renderer/src/components/GradeView.tsx
src/renderer/src/components/MatrizView.tsx
src/renderer/src/components/Navbar.tsx
src/renderer/src/components/ProfessoresView.tsx
src/renderer/src/components/RelatoriosView.tsx
src/renderer/src/components/TurmasView.tsx
src/renderer/src/components/TurnosView.tsx
src/shared/colors.ts
src/shared/defaultProject.ts
src/shared/pdfReports.ts
src/shared/projectOperations.ts
src/shared/reports.ts
src/shared/rules.ts
src/shared/types.ts
src/solver/cspSolver.ts
src/solver/worker.ts
tests/data.test.cjs
tests/desktop.e2e.cjs
tests/fixtures.cjs
tests/reports.test.cjs
tests/rules.test.cjs
tests/security.test.cjs
tests/solver.test.cjs
tests/worker.test.cjs
```

Também foram atualizados README.md e este registro, e incluída a licença MIT declarada pelo projeto.

## Regressão adicional de fixações

Um teste adicional reproduziu colisão entre o ID de uma aula movida/fixada e o ID de uma nova aula na posição antiga. O gerador agora reserva os IDs das fixações e gera sufixos únicos, sem alterar os registros fixos. O caso falhou antes da correção e passou depois; todos os 60 testes de módulos e as três execuções dos 11 testes desktop foram repetidos com o solver corrigido. O pacote e o AppImage foram reconstruídos e conferidos contra o build final.
