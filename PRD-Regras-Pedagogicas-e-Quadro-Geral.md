# Documento de Requisitos de Produto (PRD) 📋
## Vibe Lab Horário - Módulo: Regras Pedagógicas Avançadas & Quadro Geral por Turno
**Versão**: 1.1.0  
**Data**: 14 de Outubro de 2026  
**Autores**: Sérgio (Professor, Pedagogo e Vibe Coder) & Antigravity  
**Ambiente**: Desktop Linux / Windows (Electron 100% Offline, Local-First, FOSS)

---

## 1. Visão Geral e Justificativa ("Por que construir?")

Nas escolas públicas e privadas da educação básica brasileira (especialmente Ensino Fundamental II e Ensino Médio), a organização da rotina escolar depende de dois pilares fundamentais:

1. **A Visão Panorâmica da Gestão (Quadro Geral por Turno)**:
   A direção e a coordenação pedagógica precisam de um documento centralizado que mostre, em uma única página ou painel, onde cada professor e cada turma estão em cada minuto do turno (Matutino, Vespertino, etc.). Sem isso, a escola fica cega para remanejamentos, substituições de emergência e acompanhamento pedagógico.
   
2. **A Saúde Pedagógica do Horário (Fim da Aula Picada e Choques)**:
   * **Choques de Horário**: Ter um professor escalado em duas turmas diferentes no mesmo horário é uma falha inaceitável. O sistema deve garantir integridade matemática absoluta.
   * **Aulas Picadas no Mesmo Dia**: Quando uma disciplina tem 2 aulas no mesmo dia e o algoritmo coloca a 1ª aula no 1º tempo, pula o 2º tempo e coloca a outra aula no 3º tempo, o professor perde o fio da meada da aula, tem que encerrar um assunto, esperar e retomar depois. Isso gera desgaste docente e desatenção dos alunos. As aulas no mesmo dia **devem ser sempre geminadas (contíguas)**.
   * **Distribuição de Carga Pesada (Português e Matemática)**: Matérias com 5 ou 6 aulas semanais precisam de blocos estruturados (ex: Português em 2+2+1 ou 3+2; Matemática em blocos geminados de 2 aulas).

---

## 2. Requisitos Funcionais Detalhados ("O que construir?")

### RF01: Quadro Geral de Horários por Turno (Visão Interativa na Grade)
* **RF01.1**: Na aba **Grade Semanal**, ativar o modo de exibição **"Quadro Geral por Turno"**.
* **RF01.2**: Adicionar um seletor de Turno (ex: *Matutino*, *Vespertino*, *Noturno*).
* **RF01.3**: Montar a matriz completa do turno selecionado:
  * **Linhas da Tabela**: Todas as turmas cadastradas naquele turno (ex: 6º Ano A, 6º Ano B, 7º Ano A, 8º Ano A...).
  * **Colunas Principais**: Dias da semana letivos (Segunda a Sexta-feira).
  * **Sub-colunas**: Cada tempo de aula do turno (1º, 2º, 3º, 4º, 5º tempo...).
  * **Células da Grade**:
    * Exibição destacada da **Sigla da Disciplina** com a cor temática da matéria.
    * Exibição do **Nome ou Sigla do Docente**.
    * Destaque visual claro para tempos vagos ou aulas não alocadas.
* **RF01.4**: Suporte a clique para identificação rápida e visualização sem poluição visual.

---

### RF02: Relatório e Exportação em PDF do Quadro Geral por Turno
* **RF02.1**: Na aba **Relatórios e Impressão**, adicionar o botão: **`[ 📄 Gerar PDF do Quadro Geral por Turno ]`**.
* **RF02.2**: Formatação do documento em **A4 Paisagem (Landscape)**.
* **RF02.3**: Gerar uma página dedicada para cada turno da escola.
* **RF02.4**: Cabeçalho oficial contendo:
  * Nome da Escola
  * Ano Letivo
  * Identificação do Turno (ex: *Turno Matutino - Horário das 07:30 às 12:00*)
  * Data de emissão
* **RF02.5**: Grade com formatação de alta legibilidade, bordas firmes, tipografia nítida e células proporcionais para impressão direta em impressoras da escola e afixação no mural da sala dos professores.

---

### RF03: Exportação em Planilha Excel do Quadro Geral por Turno
* **RF03.1**: Ao clicar em **`[ 📊 Exportar Planilha Excel (.xlsx) ]`**, incluir uma aba dedicada para cada turno com a matriz completa de Turmas x Dias x Tempos.

---

### RF04: Restrição Estrita Anti-Choque (Docentes e Espaços Físicos)
* **RF04.1 (Choque de Docente)**: Um professor **JAMAIS** poderá ter aulas alocadas em duas turmas diferentes no mesmo dia e mesmo horário de tempo do turno.
* **RF04.2 (Choque de Sala Física)**: Se duas turmas tiverem a mesma sala física padrão configurada (ex: *Laboratório de Ciências* ou *Sala 01*), elas não poderão ter aula simultânea no mesmo horário.
* **RF04.3 (Integridade na Edição Manual)**: Na tela de Grade Semanal, qualquer tentativa de troca manual de aula que resulte em choque de docente ou sala será imediatamente bloqueada com alerta explicativo in-app.

---

### RF05: Geminação Contígua Obrigatória (Fim da Aula Picada no Mesmo Dia)
* **RF05.1 (Continuidade Estrita)**: Se uma turma tiver 2 ou mais aulas da mesma disciplina no mesmo dia, essas aulas **DEVEM ser obrigatoriamente vizinhas/contíguas** (ex: tempos 1 e 2, tempos 2 e 3, ou tempos 4 e 5).
* **RF05.2 (Proibição de Quebra)**: O algoritmo CSP é estritamente proibido de alocar aulas da mesma matéria separadas por intervalo ou tempos vagos no mesmo dia (ex: proibir 1º tempo e 3º tempo no mesmo dia).
* **RF05.3**: Caso uma matéria tenha aulas simples (tamanho 1), elas devem ocorrer em **dias letivos diferentes**.

---

### RF06: Distribuição Pedagógica Especial de Cargas Horárias
* **RF06.1 (Língua Portuguesa - 5 Aulas)**:
  * Prioridade máxima: Decomposição em **2 + 2 + 1** (duas aulas geminadas na Segunda, duas aulas geminadas na Quarta e uma aula simples na Sexta, por exemplo).
  * Alternativa válida caso restrições de disponibilidade exijam: **3 + 2** (um bloco contíguo de 3 tempos e um bloco geminado de 2 tempos em outro dia).
* **RF06.2 (Matemática - 5 ou 6 Aulas)**:
  * Prioridade máxima: Sempre blocos geminados contíguos de **2 aulas** (ex: 2 + 2 + 1 ou 2 + 2 + 2).
  * Suporte a 4 aulas em um único dia se configurado explicitamente na matriz curricular.
* **RF06.3 (História, Geografia, Ciências, etc. - 2 a 4 Aulas)**:
  * Cargas de 2 aulas: 1 par geminado contíguo de 2 aulas (ou 1 + 1 em dias separados).
  * Cargas de 3 aulas: 1 par geminado contíguo de 2 aulas + 1 aula simples em outro dia.
  * Cargas de 4 aulas: 2 pares geminados contíguos de 2 aulas em dias diferentes (2 + 2).

---

## 3. Critérios de Aceitação e Validação

| ID | Critério | Verificação |
|---|---|---|
| **CA-01** | Visualização do Quadro Geral por Turno | A tela Grade Semanal exibe a matriz completa de todas as turmas de um turno selecionado. |
| **CA-02** | Impressão e PDF do Quadro Geral | O arquivo PDF é gerado em folha paisagem A4 com todas as turmas do turno e cabeçalho oficial. |
| **CA-03** | Zero Choque de Docentes | Relatório de auditoria e cálculo garantem 0 colisões de professores em turmas simultâneas. |
| **CA-04** | Aulas Geminadas Contíguas | Nenhuma matéria na grade semanal tem aulas no mesmo dia separadas por janela. |
| **CA-05** | Distribuição de Português/Matemática | Grades geradas distribuem Português preferencialmente em 2+2+1 e Matemática em blocos geminados de 2. |

---

## 4. Próximos Passos no Fluxo Spec Kit

1. Validar e aprovar os requisitos deste documento com o usuário Sérgio.
2. Aguardar o comando **`/speckit.plan`** para desenhar a arquitetura técnica e o plano de implementação (`implementation_plan.md`).
3. Aguardar o comando **`/speckit.tasks`** para listar o checklist atômico em `task.md`.
4. Aguardar o comando **`/speckit.implement`** para executar a codificação passo a passo.
