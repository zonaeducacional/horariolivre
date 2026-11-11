# Nova homologação humana — Missão 03

Use exclusivamente cópias fictícias. O AppImage desta missão é identificado pelo SHA-256 registrado no relatório, pois a versão interna permanece 1.1.0. Preserve seus projetos reais e versões anteriores.

1. Inicie o AppImage; anote sistema, resolução e identificação do artefato. Os testes automáticos Linux usaram extração (`APPIMAGE_EXTRACT_AND_RUN=1`), sem FUSE.
2. Copie os três arquivos `tests/fixtures/homologacao/*.json` para uma pasta de teste e renomeie as cópias para `.grade` antes de abrir no diálogo do aplicativo. Quantidades: Pequena 5 turmas/10 docentes/125 aulas; Média 12/25/300; Grande 24/45/600. Os arquivos são exatamente os homologados, sem a grade de referência.
3. Em janela de 800×600, abra uma cópia. Confira o resumo dos avisos, expanda com Enter ou Espaço e percorra os detalhes com teclado. A navegação deve continuar acessível, inclusive pela rolagem lateral. Fechar os avisos não deve ser necessário para navegar.
4. Confira cinco dias, turnos matutino/vespertino, cinco tempos de 50 minutos, recreio após o segundo tempo. Cada turma tem Português 5, Matemática 5, Ciências 3, História 3, Geografia 3, Inglês 2, Arte 2 e Educação Física 2. Essa matriz é fictícia e não certifica conformidade curricular.
5. Confira disponibilidades e limite docente de cinco aulas/dia. “Priorizar horários sem janelas” deve estar descrito como preferência, sem garantia.
6. Gere cada cenário e cronometre. Aprovar somente com 125/300/600 aulas completas e resultado de sucesso; limite de tempo não prova impossibilidade. O teto continua em 30 segundos. Os tempos do relatório são referências desta máquina, não garantias para todo computador.
7. Confira amostras por turma e professor: cargas, indisponibilidades, ausência de choques e recreio. Não é necessário obter a mesma distribuição do certificado.
8. Durante um cálculo, pressione Interromper. A grade anterior deve permanecer e novo cálculo deve ser possível. Se o cálculo terminar antes, repita; não registre essa tentativa como teste de cancelamento aprovado.
9. No editor manual, tente uma troca que coloque um docente em horário indisponível ou provoque choque. Deve ser rejeitada sem alterar as aulas. Faça uma troca válida, confira as fixações e regenere: elas devem permanecer.
10. Use Salvar como para gravar na pasta de teste; feche e reabra. Confira a carga e as alterações. Após uma nova gravação, verifique o `.bak`. Não grave sobre os cenários originais.
11. Exporte quadro geral, horários de turmas/docentes e Excel. No quadro geral dos três casos, espere duas páginas A4 paisagem, uma por turno. Leia as siglas POR, MAT e D01/Dxx sem divisão interna. Continuações de tabelas maiores devem repetir a identificação; siglas longas podem gerar painéis horizontais identificados.
12. Imprima o quadro geral em tamanho real. Aprove a legibilidade com um professor; a fonte mínima dos identificadores é 8 pontos. Confira algumas células de cada dia, especialmente docentes que atuam em dois turnos.
13. Em uma cópia, configure uma turma com 26 aulas para seus 25 horários semanais: deve haver diagnóstico de impossibilidade, sem substituir a última grade. Limite de nós/tempo deve ter diagnóstico distinto.
14. Repita abertura, geração, edição e exportação sem conexão à internet.

## Critérios de aprovação

- [ ] Geração completa nos três portes, dentro do teto, sem violar regras obrigatórias.
- [ ] Avisos completos e navegáveis sem bloquear controles em janela pequena.
- [ ] Cancelamento efetivo e última grade preservada.
- [ ] Edição inválida bloqueada; edição válida e fixações preservadas.
- [ ] Salvar/reabrir e backup sem perda de dados.
- [ ] PDF legível em papel, sem siglas partidas, com todos os turnos/células.
- [ ] Operação offline aprovada.

Registre Aprovado, Aprovado com ressalvas ou Reprovado por cenário, com passos, captura e arquivo fictício. Solicite decisão do responsável antes de merge/publicação; esta missão não executa nenhum deles.
