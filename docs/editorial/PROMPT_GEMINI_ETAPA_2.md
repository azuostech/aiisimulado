# Gemini — Etapa 2: auditoria editorial e lote de calibração ANCORD

Você está recebendo um recorte seguro do repositório do projeto AIISimulado. Continue a pesquisa da Etapa 1, mas agora trabalhe sobre o banco real. Não solicite novamente conteúdo programático, matriz, taxonomias ou fontes que já estejam no pacote.

## Objetivo desta etapa

Auditar as 161 questões atuais, definir o **DNA Editorial ANCORD v2** e produzir somente um lote de calibração com 32 questões candidatas. Não produza ainda as demais questões da expansão até 340 e não altere arquivos existentes.

O problema a corrigir é concreto: as questões atuais permitem notas altas por reconhecimento, eliminação de alternativas absurdas e repetição de padrões. O novo banco deve exigir domínio do conceito, transferência para cenários diferentes e distinção entre alternativas plausíveis.

## Arquivos do pacote

- `data/questions/`: 156 questões editoriais em JSON.
- `prisma/seed.sql`: contém a matriz oficial e as 5 questões do lote piloto que completam as 161 atuais.
- `data/taxonomy/`: árvore de 813 nós dos 14 temas.
- `scripts/questions/`: contrato estrutural, validação, testes, carga e auditoria.
- `prisma/schema.prisma`: modelo editorial e de desempenho.
- `src/server/services/create-exam-session.ts`: seleção de questões por tema, família, subtema e dificuldade.
- `SOURCES.md`: fontes oficiais, secundárias, alterações normativas e sinais comunitários já registrados.
- `README.md` e `package.json`: estado e comandos do projeto.

Não há credenciais nem acesso ao banco remoto no pacote. A auditoria das 5 questões piloto deve ser feita diretamente em `prisma/seed.sql`.

## Fatos fixos do projeto

- Prova: 80 questões, 4 alternativas, 150 minutos, aprovação geral de 70%.
- Temas eliminatórios: I, III, VIII e XV, com mínimo de 50% em cada.
- Matriz por prova: I 12; III 4; IV 2; V 3; VI 3; VII 4; VIII 20; IX 4; X 2; XI 1; XII 2; XIII 4; XIV 7; XV 12.
- Banco atual com 161 questões: I 13; III 13; IV 8; V 8; VI 8; VII 8; VIII 21; IX 8; X 8; XI 8; XII 8; XIII 17; XIV 16; XV 17.
- Meta com 340 questões: I 51; III 17; IV 8; V 12; VI 12; VII 17; VIII 85; IX 16; X 8; XI 8; XII 8; XIII 17; XIV 30; XV 51.
- Expansão líquida prevista: I +38; III +4; IV +0; V +4; VI +4; VII +9; VIII +64; IX +8; X +0; XI +0; XII +0; XIII +0; XIV +14; XV +34. Total: 179.

## Hierarquia das fontes

Use fontes oficiais e normativas para validar conteúdo e gabarito: ANCORD/FGV, CVM, Banco Central, B3, Tesouro Nacional, Receita Federal, legislação federal e demais autoridades indicadas em `SOURCES.md`.

Use fóruns, relatos de candidatos, vídeos, comentários, blogs e simulados públicos somente para investigar linguagem, armadilhas, extensão, incidências percebidas e erros recorrentes. Não use relato comunitário como fundamento normativo. Não copie questões de bancos comerciais, materiais protegidos, paywalls ou provas não autorizadas. Toda questão deve ser original.

Se uma fonte oficial atual contradisser um item existente, registre a divergência com URL, localizador, versão/vigência e data de consulta. Considere a regra de incorporação de mudanças normativas descrita em `SOURCES.md`.

## Etapa 2A — auditoria das 161 questões

1. Faça uma varredura estrutural de todas as 161 questões.
2. Faça auditoria editorial detalhada de pelo menos 50 questões, com amostra estratificada que inclua:
   - no mínimo 10 do Tema I;
   - no mínimo 8 do Tema III;
   - no mínimo 14 do Tema VIII;
   - no mínimo 10 do Tema XV;
   - no mínimo 8 distribuídas entre os demais temas;
   - pelo menos 3 das 5 questões piloto de `prisma/seed.sql`.
3. Na escolha da amostra, priorize itens classificados como fáceis, enunciados diretos, alternativas de comprimentos muito diferentes, gabaritos reconhecíveis, famílias repetitivas e cálculos de uma única etapa.
4. Para cada item detalhado, informe o ID e atribua notas de 0 a 2 para:
   - correção técnica e atualidade;
   - fidelidade ao escopo oficial;
   - demanda cognitiva real;
   - plausibilidade dos três distratores;
   - independência de pistas formais;
   - clareza sem simplificação excessiva;
   - qualidade da explicação;
   - qualidade e precisão da fonte/localizador.
5. Classifique o destino recomendado: `MANTER`, `REESCREVER`, `REBAIXAR_DIFICULDADE`, `ELEVAR_DIFICULDADE`, `ATUALIZAR_FONTE`, `DESATIVAR` ou `SUBSTITUIR`.
6. Não aceite a dificuldade declarada no JSON sem análise. Estime a dificuldade real e explique divergências relevantes.

Detecte expressamente estes defeitos:

- resposta correta mais longa, técnica ou específica que as demais;
- alternativas absurdas ou fora do mesmo plano conceitual;
- palavras absolutas que denunciam erro sem que isso seja o conceito testado;
- enunciado que entrega a resposta por repetição lexical;
- item resolvível sem ler o caso;
- mera troca de nomes ou números entre itens da mesma família;
- definição decorativa rotulada como aplicação/análise;
- cálculo trivial ou com distratores que não correspondem a erros reais;
- duas alternativas defensáveis;
- uso de norma antiga ou generalização indevida;
- fonte genérica sem localizador capaz de sustentar o gabarito.

## Escala de dificuldade real

- Nível 1 — reconhecimento direto de definição; uma pista costuma bastar.
- Nível 2 — aplicação simples ou distinção direta entre dois conceitos.
- Nível 3 — cenário com duas relações necessárias ou cálculo com interpretação.
- Nível 4 — exceção, conflito, consequência, múltiplas condições ou cálculo com decisão.
- Nível 5 — integração de três ou mais decisões/regras, sem ambiguidade e dentro do programa.

Para novas questões, use como alvo inicial: nível 2 = 10%, nível 3 = 45%, nível 4 = 40%, nível 5 = 5%, sem novas questões de nível 1. Isso é uma hipótese editorial a ser calibrada empiricamente, não uma estatística oficial da ANCORD.

## DNA Editorial ANCORD v2

Após a auditoria, produza um manual operacional contendo regras verificáveis para:

- construção de enunciados;
- casos realistas e quantidade de informações relevantes;
- famílias e ângulos cognitivos por nó terminal;
- distratores baseados em confusões reais;
- distribuição de gabaritos A/B/C/D sem padrão previsível;
- questões de afirmações I, II, III quando adequadas;
- cálculos, arredondamento e uso de HP12C;
- explicações que mostrem por que a correta está certa e cada distrator está errado;
- citação de fonte oficial com localizador;
- critérios objetivos de dificuldade 2 a 5;
- limites de semelhança entre questões;
- checklist de aprovação e motivos de rejeição.

Exija que pelo menos 60% das novas questões sejam de caso, aplicação, análise ou cálculo interpretado. Questões de definição direta não podem ultrapassar 15% e não devem ser usadas para preencher artificialmente a meta.

Cada nó terminal relevante deve possuir várias famílias, e cada família deve testar ângulos distintos. Reescrever o mesmo enunciado não cria uma nova família.

## Etapa 2B — lote de calibração com 32 candidatas

Somente depois de concluir a auditoria e o DNA v2, produza 32 questões originais:

- 8 do Tema I;
- 8 do Tema III;
- 8 do Tema VIII;
- 8 do Tema XV.

As 8 do Tema III são **candidatas de calibração**. Na expansão líquida até 340, somente 4 podem aumentar o total ativo do tema. As outras 4 devem ser indicadas como candidatas a substituir itens fracos existentes, permanecer fora do banco ativo ou ser rejeitadas após a auditoria humana. Não altere a meta final de 17 questões ativas no Tema III sem justificar formalmente uma nova distribuição.

Distribuição desejada nas 32 candidatas:

- 3 de dificuldade 2;
- 14 de dificuldade 3;
- 13 de dificuldade 4;
- 2 de dificuldade 5.

No conjunto, inclua ao menos:

- 20 questões de caso/aplicação/análise;
- 6 questões que integrem dois conceitos próximos;
- 6 questões de afirmações ou julgamento de combinações, sem padrão mecânico;
- 4 questões com cálculo ou apuração de resultado, concentradas quando fizer sentido nos Temas VIII e XV;
- 24 famílias distintas;
- nenhum par que seja apenas paráfrase.

Para o Tema XV, cubra obrigatoriamente cenários de titular/lançador, call/put, prêmio/strike/resultado, futuro de dólar, hedge de importador/exportador, ajuste diário e margem. Para o Tema I, priorize fronteiras profissionais, múltiplos vínculos, transição, remuneração/conflitos, vedações e responsabilidades. Para o Tema III, diferencie cadastro, suitability e PLD/FTP em cenários concretos. Para o Tema VIII, priorize mercado primário/secundário, ordens, eventos societários, debêntures, BTC, clearing, custódia e liquidação.

Cada candidata deve respeitar exatamente o contrato JSON observado em `data/questions`, incluindo quatro alternativas, uma única correta, `distractorReason` em cada incorreta, explicação, armadilha, família, nó terminal, dificuldade, habilidade cognitiva e fonte oficial completa. Use status `DRAFT`; não use `ACTIVE`.

## Auditoria do gerador de provas

Leia `src/server/services/create-exam-session.ts` e responda separadamente:

1. A seleção preserva exatamente a quantidade oficial por tema em cada simulado de 80?
2. Ela garante famílias únicas e diversidade de subtemas?
3. Ela controla de forma confiável o mix global de dificuldades ou apenas o aproxima?
4. Ela garante cobertura/diversidade de nós terminais entre várias provas?
5. Quais mudanças mínimas seriam necessárias para que 10 provas tenham composição substancialmente diferente sem violar matriz e dificuldade?

Não altere código nesta etapa. Apresente recomendações específicas, com referência às funções/constantes relevantes.

## Entregáveis obrigatórios

Entregue, nesta ordem:

1. `AUDITORIA_161.md`: diagnóstico global, amostra detalhada por ID, métricas e prioridades.
2. `DNA_EDITORIAL_ANCORD_V2.md`: manual operacional completo.
3. `PLANO_CORRECAO_161.md`: itens a manter, reescrever, substituir ou desativar, por prioridade.
4. `AUDITORIA_GERADOR.md`: avaliação da fidelidade por simulado.
5. Quatro JSONs de calibração, um por tema, totalizando 32 questões `DRAFT`.
6. `FONTES_PESQUISA_ETAPA_2.md`: URLs, tipo, confiabilidade, data de consulta e uso editorial.
7. `RESUMO_EXECUTIVO.md`: achados, riscos, decisão sobre as 4 candidatas excedentes do Tema III e recomendação de aprovar/reprovar o lote.

Antes de entregar, faça uma autocrítica questão a questão e valide:

- uma única resposta inequivocamente correta;
- três distratores plausíveis e sustentados por erros reais;
- ausência de pistas de tamanho, gramática ou vocabulário;
- dificuldade compatível com o raciocínio exigido;
- fonte oficial realmente suficiente;
- originalidade;
- aderência ao nó e à família;
- JSON válido e compatível com os scripts.

Pare ao final desses entregáveis. Não gere as outras 147 questões e não proponha carga no banco antes da aprovação humana do lote de calibração.
