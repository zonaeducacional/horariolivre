# Missão 03 — otimização do gerador e correções de usabilidade

## A. Diagnóstico do algoritmo anterior

Referência `e616ce8`, branch `fix/estabilizacao-integral`. Relatório, roteiro, cenários e scripts da homologação foram examinados antes de editar. A árvore estava limpa. As três entradas foram preservadas byte a byte e versionadas como fixtures JSON; nenhum certificado é carregado pelo solver ou pelo benchmark.

O motor anterior é um CSP com backtracking cronológico, blocos de uma/duas aulas e seleção MRV dinâmica. Ordena valores por disponibilidade preferencial, proximidade de aulas docentes e geminação. Recalcula domínios de cada bloco restante, inclusive repetições idênticas da mesma atribuição. Cada domínio filtra novamente a grade, matriz e disponibilidades, calcula janelas e serializa chaves. Não verifica antecipadamente se todos os horários obrigatórios de uma turma ainda têm suporte. Essa combinação custa CPU e descobre contradições tarde. Não foi encontrada prova de que o cálculo de sobreposição real devesse ser substituído.

A primeira fase de busca tenta pares; a segunda permite somente aulas simples se a primeira esgotar sem atingir limites. Cancelamento, 30 segundos e 250000 nós interrompem a busca. Tempo/nós não provam impossibilidade. As preferências continuam sendo ordenação heurística, sem garantia de ótimo pedagógico.

## B. Otimizações implementadas e justificativas

1. Índices de itens, cargas e ocupação por disciplina/turma/dia; cache de janelas reais e disponibilidade por atribuição/turno. Removem filtros recorrentes no caminho de busca, preservando as regras originais.
2. Um domínio por combinação atribuição/tamanho em cada nó. Blocos equivalentes não repetem a mesma consulta MRV; não há ordenação artificial que elimine soluções.
3. Desempate MRV pelo grau de interação de turma/professor.
4. Forward checking: o conjunto de posições disponíveis deve comportar as aulas restantes de blocos equivalentes. A condição é necessária, não suficiente; por isso rejeita somente falta demonstrada de capacidade.
5. MRV dual: em turmas cuja carga restante preenche exatamente todos os horários vazios, também escolhe o horário obrigatório com menos maneiras de cobertura. Um horário obrigatório sem suporte poda o ramo. Turmas com horários opcionais não são forçadas a preenchê-los.
6. Contadores locais de nós, domínios, retrocessos, podas, posições examinadas/aceitas; tempos de preparação/busca/primeira solução. Não modificam projeto, protocolo IPC ou persistência. O diagnóstico distingue limite de tempo e limite de nós no texto do resultado.

Um ensaio intermediário somente com índices, deduplicação e desempate continuou atingindo 30 s no Médio. A cobertura de horários obrigatórios foi a mudança decisiva. Não foram adicionados CP-SAT, novas dependências, reinícios aleatórios, redução de fontes ou aumento de limites. O cálculo segue em Worker Thread; finalização e cancelamento efetivo permanecem no runner existente. Toda solução passa pelo validador compartilhado e, nos testes, pelo oráculo independente.

## C. Comparação de desempenho antes/depois

Cinco repetições por cenário e versão, processo Node novo em cada amostra, mesmas entradas, Node 22.23.3, teto 30 s/250000 nós e instrumentação de contagens comparável. Rodadas finais antes/depois em sequência; não são uma máquina dedicada. Pequenas atividades de compilação/conferência ocorreram durante parte da rodada anterior; os resultados não são um benchmark laboratorial isolado. Ensaios exploratórios concorrentes não entram nesta tabela. A diferença relevante é a entrega repetida de soluções válidas, não um fator exato de aceleração.

Tempos em segundos: mediana (mínimo–máximo). Falhas por limite não possuem tempo até solução; o teto não deve ser tratado como duração de uma solução anterior.

| Cenário | Antes: s | Sucesso antes | Depois: s | Sucesso depois |
|---|---:|---:|---:|---:|
| Pequena | 0.475 (0.412–0.483) | 5/5 | 0.269 (0.264–0.328) | 5/5 |
| Media | 30.003 (30.002–30.006) | 0/5 | 4.044 (3.990–4.338) | 5/5 |
| Grande | 30.007 (30.003–30.018) | 0/5 | 8.141 (8.090–8.971) | 5/5 |

Medianas de contagens; “rejeitadas” = posições examinadas menos aceitas durante a enumeração, sem contar dias descartados antes dela. Contagens antes nos cenários sem solução descrevem somente o prefixo de busca até o teto.

| Cenário | Versão | Nós | Domínios | Retrocessos | Podas | Posições rejeitadas |
|---|---|---:|---:|---:|---:|---:|
| Pequena | Antes | 336 | 9218 | 250 | 134 | 39517 |
| Pequena | Depois | 261 | 4455 | 175 | 90 | 18471 |
| Media | Antes | 4759 | 558170 | 4758 | 1690 | 2515417 |
| Media | Depois | 1536 | 75226 | 1331 | 615 | 295407 |
| Grande | Antes | 2290 | 453810 | 2289 | 986 | 2067658 |
| Grande | Depois | 1027 | 121514 | 618 | 286 | 450809 |

| Cenário | Versão | CPU mediana (s) | Máximo RSS mediano (MiB) | Maior RSS observado (MiB) |
|---|---|---:|---:|---:|
| Pequena | Antes | 0.615 | 67.7 | 71.5 |
| Pequena | Depois | 0.439 | 88.9 | 92.4 |
| Media | Antes | 30.397 | 99.3 | 103.0 |
| Media | Depois | 4.648 | 185.4 | 191.3 |
| Grande | Antes | 30.362 | 103.2 | 103.5 |
| Grande | Depois | 9.000 | 200.5 | 212.8 |

RSS é o máximo do processo Node por amostra, incluindo runtime/GC, não memória física exclusiva do Electron. Os índices e listas de cobertura aumentam o uso de memória; esse é um custo real da abordagem. Não foi realizada certificação em hardware modesto. Os contadores `setupMs`, `searchMs`, `firstSolutionMs` e os resultados brutos estão em `evidencias/after.json`.

## D. Resultados dos três cenários

- Pequena: 5 turmas, 10 docentes, 125 aulas; 5/5 soluções independentes válidas.
- Média: 12 turmas, 25 docentes, 300 aulas; 5/5 soluções independentes válidas.
- Grande: 24 turmas, 45 docentes, 600 aulas; 5/5 soluções independentes válidas.

Nenhuma restrição foi relaxada. O oráculo recalculou referências, cargas, colisões de turma/professor/sala por tempo real, indisponibilidades, máximos diários, continuidade, recreio, avulsas e fixações. Todos os resultados ficaram abaixo do teto original. As buscas são determinísticas: cinco repetições medem variação de tempo, não diversidade aleatória de soluções. Isso não garante sucesso para qualquer configuração escolar.

## E. Testes executados e falhas

Rodada final: **69/69 testes de módulos/integração**, **13/13 desktop de desenvolvimento** e **13/13 desktop no AppImage**: 95 execuções principais aprovadas, zero falhas finais e nenhum teste ignorado nessas rodadas. Os testes incluem persistência atômica/backup, importações inválidas, referências, edição/fixações, regras temporais, cancelamento e isolamento de snapshots, limites, impossibilidade, IPC e sandbox. O teste adicional de equivalência enumera 256 combinações de disponibilidade e compara o CSP com enumeração completa usando o oráculo. Testes de cenário utilizam o runner real.

Typecheck, lint, build de produção e empacotamento Linux AppImage aprovados. `npm audit --json`: zero vulnerabilidades informadas pelo registro nesta consulta; não é garantia contra vulnerabilidades desconhecidas. Nenhuma dependência foi adicionada/atualizada. Os testes Electron desativam a rede do contexto renderer e exercitam geração/exportação/persistência offline.

Falhas intermediárias registradas e resolvidas: import React sem uso no componente novo; largura mínima inicial que gerava quatro páginas em vez de duas; seletor desktop que esperava texto agora recolhido; estado de expansão reaproveitado entre aberturas. O teste foi ajustado para observar a interface acessível, mantendo os critérios de cancelamento e integridade. Os logs brutos permanecem em `artifacts/missao03`; o status final não apaga a existência desses ensaios.

O AppImage foi executado sequencialmente com `APPIMAGE_EXTRACT_AND_RUN=1`, perfis temporários isolados, sandbox ativo, isolamento de contexto e Node desativado no renderer. **Não foi usada montagem FUSE.** Não foram testados Windows/macOS, .deb, impressoras físicas ou leitores de tela.

## F. Correções da interface

`App.tsx`, `MessageNotice.tsx`, `Sidebar.tsx`: resumo com quantidade, detalhes nativos recolhíveis, altura interna de até 18vh e rolagem; botão de fechar fora da área rolável. O corpo admite redução de altura e a navegação lateral tem rolagem própria. Todos os avisos permanecem disponíveis. Os nove pares cenário/resolução (800×600, 1280×840, 1920×1080) passaram com detalhes abertos, navegação sem fechar o aviso e expansão por Enter. Não equivale a uma auditoria WCAG completa.

`ProfessoresView.tsx`: ambos os rótulos agora dizem “Priorizar horários sem janelas (preferência, sem garantia)”. Os pesos e a natureza heurística dessa opção foram preservados.

## G. Evidências de exportação PDF

`criarPdfQuadroGeral` foi extraído para `shared/pdfReports.ts` e chamado pela interface. Mede siglas em 8 pontos negrito, define larguras/padding, mantém duas linhas por célula e cria painéis horizontais se os identificadores forem longos. Repetição de cabeçalhos, escola/turno/ano e identificação de continuações verticais; linhas de turma não são divididas desnecessariamente. Cabeçalhos extraordinariamente extensos ou siglas maiores que a página geram erro explícito, sem truncar silenciosamente.

Os três PDFs nativos possuem duas páginas, uma por turno; o Grande caiu de quatro para duas. Foram conferidos independentemente 2050 campos disciplina/docente extraídos com coordenadas do Poppler, correspondentes a todas as 1025 aulas dos três cenários. Sem divergências ou siglas partidas. As duas páginas do Grande foram renderizadas para inspeção visual; é necessária aprovação humana da impressão A4 em tamanho real. Casos sintéticos adicionais verificam siglas longas, painéis e continuações em várias páginas, além de rejeição de carga incompleta.

## H. Commits criados

Branch `fix/estabilizacao-integral`; main preservada. Ponto de referência: `e616ce8`.

- `9c29b77` — otimização CSP, cenários exatos e oráculo/regressões.
- `67662ea` — avisos, navegação e terminologia.
- `ef949cc` — quadro geral PDF e testes de exportação.
- `7b09c9a` — consolidação dos benchmarks e da homologação da missão 03.

Sem push, merge, deploy ou publicação. Sem alteração de dados reais. As fixtures e originais foram comparados por SHA-256; os hashes constam das amostras brutas. O schema/versão dos arquivos, as regras compartilhadas de integridade e as proteções Electron permanecem preservados.

Artefato de validação: `artifacts/packages/Vibe Lab Horário-1.1.0.AppImage` (versão interna permanece 1.1.0).

SHA-256: `79518c04b836bda52386514954706237f3d13474fbd9401768004485bb453327`.

## I. Pendências e riscos

A busca continua exponencial no pior caso. Pareamento ainda é uma primeira estratégia; pode consumir o teto em outras instâncias antes da busca por aulas simples. Essa limitação foi preservada e não é confundida com prova de impossibilidade. A solução não garante ausência de janelas nem ótima distribuição pedagógica. Memória maior nos cenários grandes exige avaliação em equipamento escolar modesto. FUSE, impressão física, leitores de tela e plataformas fora do Linux não foram homologados nesta missão. O empacotador informa ícone Electron padrão e ausência de `desktopName`; avisos de integração visual, sem bloqueio do pacote.

## J. Parecer

Os quatro bloqueios desta missão foram corrigidos nos casos homologados, com os critérios automáticos relevantes aprovados. Está pronto para **nova homologação humana**, usando `ROTEIRO_HUMANO.md`. Há base técnica favorável para um merge após revisão do diff e aceitação humana de navegação, qualidade pedagógica e impressão; não recomendo tratar o teste automático como autorização de publicação. O menor próximo passo é um professor executar os três portes numa máquina representativa, sem modificar projetos reais. Nenhuma integração ou publicação foi executada.

Reprodução: `REPRODUCAO.md`. Evidências brutas versionadas: `evidencias/`; logs, PDFs, PNGs e artefatos grandes: `artifacts/missao03/`.

Evidências visuais locais: [quadro Grande](../../artifacts/missao03/grande-quadro.pdf), [primeira página](../../artifacts/missao03/grande-quadro-final-1.png), [segunda página](../../artifacts/missao03/grande-quadro-final-2.png).

## K. Conferência de encerramento — 11/11/2026

Confirmados os quatro commits da missão e a presença dos PDFs e imagens locais citados. O SHA-256 do AppImage foi recalculado e corresponde ao registrado na seção H. A homologação humana do roteiro continua pendente; não houve merge ou publicação nesta conferência.

Nesta conferência, com Node 22.23.3, `npm run typecheck`, `npm run lint` e `npm test` foram executados novamente: **69/69 testes aprovados**, sem falhas ou testes ignorados. `git diff --check` também passou. Os testes desktop, o empacotamento e os benchmarks não foram repetidos; seus resultados acima correspondem à rodada original da missão.
