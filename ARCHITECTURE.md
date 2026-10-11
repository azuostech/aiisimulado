# Arquitetura do produto

## Decisões

- Next.js com App Router para a aplicação e endpoints. PostgreSQL + Prisma na fase de persistência; Auth.js para autenticação.
- Respostas, explicações e fontes nunca são serializadas no payload de uma sessão em andamento. O servidor corrige a submissão.
- Cada sessão guarda `randomSeed`, snapshot da questão e ordem das opções. Uma edição posterior não altera o histórico.
- `exam_blueprints` versiona matriz, mínimos e vigência. Nada da matriz fica permanentemente codificado no gerador.
- Banco editorial e eventos de estudo são separados. Isso permite auditar conteúdo sem misturá-lo com desempenho do usuário.

## Estrutura alvo

```text
src/app/                  rotas, layouts e API
src/components/           componentes visuais compartilhados
src/features/exams/       sessão, timer, navegação e submissão
src/features/questions/   leitura e fluxo editorial
src/features/analytics/   agregações e readiness score
src/features/revision/    caderno de erros e repetição espaçada
src/lib/                  configuração e utilitários puros
src/server/services/      gerador, correção e validação regulatória
prisma/                   schema, migrations e seeds auditados
```

O protótipo atual concentra a experiência em `src/app/page.tsx` para validar o fluxo. A separação acima deve acontecer junto à persistência, sem antecipar abstrações de componentes ainda instáveis.

## Fluxo UX

1. Dashboard diferencia matriz oficial de foco sugerido.
2. Instruções mostram formato, nota geral e quatro mínimos obrigatórios.
3. Sessão exibe apenas enunciado e opções, com timer, navegação e marcação para revisão.
4. Submissão é corrigida no servidor e avalia nota geral **e** mínimos por eixo.
5. Resultado libera explicação, resposta correta e fonte da versão usada.
6. Erros alimentam caderno e agenda de revisão; não distorcem a matriz do simulado geral.

## Algoritmo de geração

Para cada tópico exigido pelo blueprint:

1. excluir questões inativas, desatualizadas, da mesma família ou presentes na janela dos três últimos simulados quando houver cobertura;
2. estratificar candidatos por dificuldade e subtema;
3. pontuar por tempo desde última exposição, cobertura, dificuldade e fraqueza (peso pequeno em prova real; alto no adaptativo);
4. aplicar diversidade semântica e rejeitar pares acima do limiar calibrado;
5. sortear de forma determinística com o `randomSeed` e Fisher–Yates;
6. embaralhar opções usando `option.id`, nunca uma letra fixa;
7. conferir 80 questões, contagem por tópico, famílias únicas e distribuição de gabarito entre 15 e 25 por letra;
8. persistir snapshot, IDs e ordens antes de entregar a sessão.

## Plano do banco de questões

- Primeiro marco obrigatório: 340 questões ativas e auditáveis; não iniciar a expansão para 1.500 antes da auditoria dessa amostra.
- Priorizar Temas I, III, VIII e XV, mas garantir a cobertura mínima de todos os subtemas.
- Trabalhar em lotes editoriais de 25–50 questões, cada um com dupla revisão (conteúdo e ambiguidade).
- Cada nó terminal origina famílias diferentes por ângulo cognitivo; paráfrases do mesmo enunciado não contam como famílias novas.
- Capacidade de 10 mil questões sem mudança estrutural.
- Métricas de qualidade: taxa de contestação, discriminação, tempo, dificuldade observada e última revisão.

## Riscos principais

- Mudança regulatória entre criação e prova: mitigada por versões, monitoramento e bloqueio `NEEDS_REVIEW`.
- Cobertura insuficiente para janela antirrepetição: o gerador degrada a restrição de forma explícita e registra o motivo.
- Questões ambíguas ou com alternativas defensáveis: reprovação editorial, sem publicação automática.
- Readiness enganoso com poucas questões únicas: cobertura e consistência limitam a pontuação.
- Vazamento de gabarito: DTO público específico, correção server-side e teste contratual do endpoint.
