# Simulado AI — Preparação ANCORD

Aplicação de preparação para o Exame de Certificação de Assessores de Investimentos, construída com Next.js, TypeScript, PostgreSQL e Prisma ORM.

## Estado da implementação

Concluído:

- protótipo responsivo do dashboard, instruções, prova demonstrativa e revisão comentada;
- correção server-side da demonstração, com validação do payload e sem envio prévio do gabarito ao navegador;
- schema Prisma, migration aplicada e client tipado para o domínio completo;
- seed idempotente dos 14 tópicos e da matriz oficial vigente;
- endpoint público mínimo da matriz vigente em `/api/blueprints/current`;
- cadastro, login e logout por e-mail/senha com Better Auth;
- autorização server-side em `/api/me` e `/api/sessions`;
- lote piloto e quatorze lotes editoriais com 161 questões ativas: 13 famílias no Tema I, 13 no III, 8 em cada Tema de IV a VII, 21 no VIII, 8 em cada Tema de IX a XII, 17 no XIII, 16 no XIV e 17 no XV, com fontes verificadas e seed idempotente;
- taxonomias terminais dos 14 temas cobrados, com 813 nós, famílias explícitas, trilha de revisão e histórico de exposição por usuário;
- pipeline versionado em `data/questions` e `scripts/questions` para validar, carregar e auditar lotes editoriais;
- seleção do simulado por diversidade de família, subtema e dificuldade, com bloqueio preferencial das três sessões recentes;
- liberação dinâmica do simulado geral e da blindagem conforme cobertura real do banco, sem flag fixa na interface;
- geração transacional de sessões com snapshots, condicionada à cobertura de questões ativas;
- revisão rápida conectada à persistência pessoal, com correção e fontes liberadas somente após a submissão;
- salvamento automático e retomada de sessões em andamento;
- histórico pessoal e métricas reais de sessões concluídas, média recente e questões únicas;
- reabertura da revisão comentada diretamente pelo histórico;
- caderno de erros alimentado automaticamente e favoritos gerenciados na revisão;
- novas sessões pessoais geradas diretamente do caderno de erros ou dos favoritos;
- repetição espaçada com agenda individual por questão e novas sessões formadas apenas por revisões vencidas;
- métricas de acerto por tema exibidas no painel, priorizando os temas de menor desempenho;
- quantidade e duração configuráveis nos treinos pessoais, preservadas ao retomar a sessão;
- menu completo com início, simulados, desempenho, revisão por tema, favoritos, caderno de erros e configurações de perfil;
- sessões focadas por tema, respeitando a cobertura editorial ativa, e navegação responsiva em dispositivos móveis;
- configuração segura de `DATABASE_URL`, lint e build de produção.

Próxima sequência recomendada:

1. completar o marco editorial de 340 questões, auditando amostras a cada 40–50 itens;
2. auditar amostras reais das 161 questões atuais e corrigir o DNA editorial antes da expansão até 340;
3. decompor a interface principal em componentes menores e cobri-la com testes de navegador.

O simulado geral já possui cobertura editorial e diversidade de famílias suficientes para os 14 temas. A disponibilidade continua calculada a partir do banco, não por uma flag fixa. A revisão rápida usa exclusivamente o banco persistido; `/api/demo/submit` permanece isolado apenas como legado temporário da demonstração inicial.

## Requisitos

- Node.js 22
- PostgreSQL acessível localmente ou por um provedor gerenciado
- npm

## Configuração local

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env.local`.
3. Substitua `DATABASE_URL` em `.env.local` pela conexão real. No Supabase, use preferencialmente a conexão **Session pooler**, porta 5432:

```text
postgresql://postgres.PROJECT_REF:SENHA@POOLER_HOST:5432/postgres
```

Nunca versione `.env.local` ou qualquer credencial.

Também configure `BETTER_AUTH_SECRET` com um segredo aleatório forte e `BETTER_AUTH_URL` com a URL base da aplicação (por exemplo, `http://localhost:3000` no desenvolvimento).

4. Aplique as migrations versionadas e gere o client:

```bash
npm run db:deploy
npm run db:generate
```

Use `npm run db:migrate -- --name nome_da_alteracao` somente ao desenvolver uma nova mudança de schema.

5. Inicie a aplicação com `npm run dev`.

## Deploy no Vercel

Em **Project Settings > Environment Variables**, configure para o ambiente de produção:

- `DATABASE_URL` — conexão PostgreSQL do Supabase (não use a Project URL nem a chave pública);
- `BETTER_AUTH_SECRET` — segredo aleatório com pelo menos 32 caracteres;
- `BETTER_AUTH_URL` — URL pública da aplicação, por exemplo `https://seu-dominio.com`.

Configure também o ambiente Preview se os deploys de preview precisarem acessar autenticação e banco. Depois de incluir ou alterar uma variável, faça um novo deploy para que a configuração seja aplicada. Nunca salve esses valores no repositório.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — análise estática
- `npm run db:validate` — valida o schema Prisma
- `npm run db:generate` — gera o client tipado
- `npm run db:migrate` — cria/aplica migrations no desenvolvimento
- `npm run db:deploy` — aplica migrations versionadas sem alterações interativas
- `npm run db:seed` — sincroniza tópicos e o snapshot vigente da matriz oficial
- `npm run db:studio` — abre a interface local do Prisma Studio
- `npm run questions:validate` — executa o gate estrutural dos lotes JSON
- `npm run questions:test` — testa rejeição de gabarito ambíguo e fonte ausente
- `npm run questions:seed` — carrega taxonomia, famílias, questões, opções, fontes e revisões de forma idempotente
- `npm run questions:audit` — apresenta cobertura, dificuldade e inconsistências do banco persistido

## Banco de dados

O schema está em `prisma/schema.prisma`. As migrations versionadas cobrem o domínio inicial, Better Auth, sessões de favoritos e a agenda de repetição espaçada por usuário e questão.

O runtime usa o adapter PostgreSQL oficial do Prisma 7. A aplicação obtém a conexão por `getDb()` em `src/lib/db.ts`, que falha de forma explícita quando `DATABASE_URL` não está configurada.
