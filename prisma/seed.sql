-- Snapshot verificado em 2026-10-04 no regulamento oficial ANCORD/FGV.
-- O Tema II está excluído do conteúdo programático vigente.

INSERT INTO "Topic" ("id", "code", "name") VALUES
  ('topic-I', 'I', 'A Atividade do Assessor de Investimentos'),
  ('topic-III', 'III', 'PLD/FTP e Suitability'),
  ('topic-IV', 'IV', 'Economia'),
  ('topic-V', 'V', 'Sistema Financeiro Nacional'),
  ('topic-VI', 'VI', 'Instituições e Intermediadores Financeiros'),
  ('topic-VII', 'VII', 'Administração de Risco'),
  ('topic-VIII', 'VIII', 'Mercado de Capitais — Produtos, Modalidades Operacionais e Liquidação'),
  ('topic-IX', 'IX', 'Fundos de Investimentos'),
  ('topic-X', 'X', 'Fundos de Investimento — Anexos Normativos da Resolução CVM 175'),
  ('topic-XI', 'XI', 'Securitização de Recebíveis'),
  ('topic-XII', 'XII', 'Clubes de Investimentos'),
  ('topic-XIII', 'XIII', 'Matemática Financeira — Conceitos Básicos'),
  ('topic-XIV', 'XIV', 'Mercado Financeiro — Outros Produtos e Modalidades Operacionais'),
  ('topic-XV', 'XV', 'Mercados Derivativos — Produtos, Modalidades Operacionais e Liquidação')
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name";

INSERT INTO "ExamBlueprint" (
  "id",
  "version",
  "questionCount",
  "durationMinutes",
  "passingPercentage",
  "effectiveFrom",
  "officialSourceUrl",
  "reviewedAt"
) VALUES (
  'blueprint-ancord-2026-10-04',
  'ancord-current-2026-10-04',
  80,
  150,
  70,
  TIMESTAMPTZ '2026-10-04 00:00:00-03',
  'https://certpessoas.fgv.br/ancord/arquivos/RegulamentoAI.htm',
  TIMESTAMPTZ '2026-10-04 00:00:00-03'
)
ON CONFLICT ("version") DO UPDATE SET
  "questionCount" = EXCLUDED."questionCount",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "passingPercentage" = EXCLUDED."passingPercentage",
  "officialSourceUrl" = EXCLUDED."officialSourceUrl",
  "reviewedAt" = EXCLUDED."reviewedAt";

INSERT INTO "BlueprintTopic" (
  "id",
  "blueprintId",
  "topicCode",
  "questionCount",
  "minimumCorrect"
)
SELECT
  values_to_insert."id",
  blueprint."id",
  values_to_insert."topicCode",
  values_to_insert."questionCount",
  values_to_insert."minimumCorrect"
FROM "ExamBlueprint" AS blueprint
CROSS JOIN (
  VALUES
    ('blueprint-topic-I', 'I', 12, 6),
    ('blueprint-topic-III', 'III', 4, 2),
    ('blueprint-topic-IV', 'IV', 2, NULL),
    ('blueprint-topic-V', 'V', 3, NULL),
    ('blueprint-topic-VI', 'VI', 3, NULL),
    ('blueprint-topic-VII', 'VII', 4, NULL),
    ('blueprint-topic-VIII', 'VIII', 20, 10),
    ('blueprint-topic-IX', 'IX', 4, NULL),
    ('blueprint-topic-X', 'X', 2, NULL),
    ('blueprint-topic-XI', 'XI', 1, NULL),
    ('blueprint-topic-XII', 'XII', 2, NULL),
    ('blueprint-topic-XIII', 'XIII', 4, NULL),
    ('blueprint-topic-XIV', 'XIV', 7, NULL),
    ('blueprint-topic-XV', 'XV', 12, 6)
) AS values_to_insert("id", "topicCode", "questionCount", "minimumCorrect")
WHERE blueprint."version" = 'ancord-current-2026-10-04'
ON CONFLICT ("blueprintId", "topicCode") DO UPDATE SET
  "questionCount" = EXCLUDED."questionCount",
  "minimumCorrect" = EXCLUDED."minimumCorrect";

-- Lote piloto original, conferido individualmente em fontes oficiais em 2026-10-04.
-- O lote habilita a revisão rápida persistida; ainda não cobre o simulado oficial de 80 questões.

INSERT INTO "Subtopic" ("id", "slug", "name", "topicId") VALUES
  ('subtopic-i-vedacoes', 'atividade-assessor-vedacoes', 'Regras de conduta e vedações', 'topic-I'),
  ('subtopic-iii-abr', 'pld-abordagem-baseada-risco', 'Abordagem baseada em risco', 'topic-III'),
  ('subtopic-viii-ofertas', 'mercado-capitais-ofertas', 'Ofertas públicas', 'topic-VIII'),
  ('subtopic-xiii-compostos', 'matematica-juros-compostos', 'Regime de capitalização composta', 'topic-XIII'),
  ('subtopic-xv-hedge', 'derivativos-hedge-cambial', 'Hedge cambial com futuros', 'topic-XV')
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "topicId" = EXCLUDED."topicId";

INSERT INTO "QuestionFamily" ("id", "code", "name", "angle", "subtopicId") VALUES
  ('FAM-I-VEDACOES-PROCURACAO', 'FAM-I-VEDACOES-PROCURACAO', 'Vedação à procuração', 'piloto original', 'subtopic-i-vedacoes'),
  ('FAM-III-ABR-CLASSIFICACAO', 'FAM-III-ABR-CLASSIFICACAO', 'Classificação de risco em PLD', 'piloto original', 'subtopic-iii-abr'),
  ('FAM-VIII-OFERTA-PRIMARIA', 'FAM-VIII-OFERTA-PRIMARIA', 'Oferta primária', 'piloto original', 'subtopic-viii-ofertas'),
  ('FAM-XIII-COMPOSTOS-VF', 'FAM-XIII-COMPOSTOS-VF', 'Valor futuro composto', 'piloto original', 'subtopic-xiii-compostos'),
  ('FAM-XV-HEDGE-IMPORTADOR', 'FAM-XV-HEDGE-IMPORTADOR', 'Hedge cambial do importador', 'piloto original', 'subtopic-xv-hedge')
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "angle" = EXCLUDED."angle",
  "subtopicId" = EXCLUDED."subtopicId";

INSERT INTO "RegulationVersion" (
  "id", "authority", "normNumber", "versionLabel", "officialUrl", "publishedAt", "effectiveAt", "checkedAt"
) VALUES
  ('reg-cvm-178-2023', 'CVM', 'Resolução CVM 178', 'Texto oficial republicado em 03/08/2023', 'https://conteudo.cvm.gov.br/legislacao/resolucoes/resol178.html', TIMESTAMPTZ '2023-02-14 00:00:00-03', TIMESTAMPTZ '2023-06-01 00:00:00-03', TIMESTAMPTZ '2026-10-04 00:00:00-03'),
  ('reg-cvm-50-consolidada', 'CVM', 'Resolução CVM 50', 'Texto consolidado consultado em 04/10/2026', 'https://conteudo.cvm.gov.br/legislacao/resolucoes/resol050.html', TIMESTAMPTZ '2021-08-31 00:00:00-03', TIMESTAMPTZ '2021-10-01 00:00:00-03', TIMESTAMPTZ '2026-10-04 00:00:00-03'),
  ('reg-cvm-160-consolidada', 'CVM', 'Resolução CVM 160', 'Texto consolidado consultado em 04/10/2026', 'https://conteudo.cvm.gov.br/legislacao/resolucoes/resol160.html', TIMESTAMPTZ '2022-07-13 00:00:00-03', TIMESTAMPTZ '2023-01-02 00:00:00-03', TIMESTAMPTZ '2026-10-04 00:00:00-03'),
  ('reg-bcb-educacao-compostos', 'BCB', 'Caderno de Educação Financeira', 'Versão oficial consultada em 04/10/2026', 'https://www.bcb.gov.br/pre/pef/port/caderno_cidadania_financeira.pdf', NULL, NULL, TIMESTAMPTZ '2026-10-04 00:00:00-03'),
  ('reg-b3-futuro-dolar', 'B3', 'Mercado Futuro', 'Conteúdo institucional consultado em 04/10/2026', 'https://borainvestir.b3.com.br/tipos-de-investimentos/renda-variavel/commodities/mercado-futuro-o-que-e-e-como-funciona-bora-investir/', NULL, NULL, TIMESTAMPTZ '2026-10-04 00:00:00-03')
ON CONFLICT ("authority", "normNumber", "versionLabel") DO UPDATE SET
  "officialUrl" = EXCLUDED."officialUrl",
  "checkedAt" = EXCLUDED."checkedAt";

INSERT INTO "Question" (
  "id", "version", "status", "topicId", "subtopicId", "familyId", "familyAngle", "difficulty", "questionType",
  "statement", "explanation", "commonTrap", "estimatedTimeSeconds", "calculationRequired",
  "calculatorAllowed", "sourceConfidence", "qualityScore", "regulationVersion", "lastReviewedAt", "updatedAt"
) VALUES
  ('Q-I-001', 1, 'ACTIVE', 'topic-I', 'subtopic-i-vedacoes', 'FAM-I-VEDACOES-PROCURACAO', 'aplicar vedação em procuração temporária', 2, 'SINGLE_CHOICE',
   'Uma assessora de investimentos recebe de um cliente uma procuração para representá-lo perante o intermediário durante uma viagem. Qual conduta está de acordo com a regulamentação?',
   'A Resolução CVM 178 veda ao assessor ser procurador ou representante de clientes perante intermediários, para quaisquer fins.',
   'Condições como prazo curto, comunicação ao intermediário ou limitação dos produtos não afastam a vedação.', 90, false, false, 'OFFICIAL', 1.000, 'Resolução CVM 178/2023', TIMESTAMPTZ '2026-10-04 00:00:00-03', CURRENT_TIMESTAMP),
  ('Q-III-001', 1, 'ARCHIVED', 'topic-III', 'subtopic-iii-abr', 'FAM-III-ABR-CLASSIFICACAO', 'relacionar risco e intensidade dos controles', 2, 'SINGLE_CHOICE',
   'Ao classificar um cliente como de maior risco de LD/FTP, como a instituição deve orientar seus controles?',
   'A abordagem baseada em risco exige medidas de prevenção e mitigação proporcionais aos riscos identificados, com tratamento compatível com a classificação do cliente.',
   'Risco elevado não produz, isoladamente, recusa automática nem dispensa de monitoramento.', 90, false, false, 'OFFICIAL', 1.000, 'Resolução CVM 50/2021 — texto consolidado', TIMESTAMPTZ '2026-10-04 00:00:00-03', CURRENT_TIMESTAMP),
  ('Q-VIII-001', 1, 'ACTIVE', 'topic-VIII', 'subtopic-viii-ofertas', 'FAM-VIII-OFERTA-PRIMARIA', 'classificar follow-on pela destinação dos recursos', 2, 'SINGLE_CHOICE',
   'Uma companhia já listada emite novas ações e as distribui ao público para financiar sua expansão. Como essa operação é classificada?',
   'A emissão de novas ações, com recursos destinados à companhia emissora, caracteriza distribuição primária. Como a companhia já é listada, trata-se de oferta subsequente.',
   'Oferta subsequente não é sinônimo de mercado secundário; o destino dos recursos distingue a distribuição primária da secundária.', 100, false, false, 'OFFICIAL', 1.000, 'Resolução CVM 160/2022 — texto consolidado', TIMESTAMPTZ '2026-10-04 00:00:00-03', CURRENT_TIMESTAMP),
  ('Q-XIII-001', 1, 'ACTIVE', 'topic-XIII', 'subtopic-xiii-compostos', 'FAM-XIII-COMPOSTOS-VF', 'calcular valor futuro em dois períodos', 1, 'SINGLE_CHOICE',
   'Um capital de R$ 10.000 rende 1% ao mês, sob capitalização composta, durante dois meses. Qual é o valor futuro?',
   'Em capitalização composta, FV = 10.000 × (1 + 0,01)² = R$ 10.201,00.',
   'Somar dois juros de R$ 100 ignora que o rendimento do segundo período incide também sobre o juro incorporado no primeiro.', 90, true, true, 'OFFICIAL', 1.000, 'BCB — Caderno de Educação Financeira', TIMESTAMPTZ '2026-10-04 00:00:00-03', CURRENT_TIMESTAMP),
  ('Q-XV-001', 1, 'ACTIVE', 'topic-XV', 'subtopic-xv-hedge', 'FAM-XV-HEDGE-IMPORTADOR', 'identificar a posição do importador', 2, 'SINGLE_CHOICE',
   'Uma empresa brasileira pagará uma importação em dólares em 90 dias e deseja proteção contra a valorização da moeda americana. Qual posição é compatível com esse hedge?',
   'A empresa terá de comprar dólares no futuro e perde com a alta da moeda. A compra de contratos futuros de dólar tende a gerar ganho nesse cenário e compensar o maior desembolso.',
   'Vender dólar futuro protege quem receberá dólares; não quem precisará comprá-los.', 100, false, false, 'OFFICIAL', 1.000, 'B3 — Mercado Futuro', TIMESTAMPTZ '2026-10-04 00:00:00-03', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "status" = EXCLUDED."status",
  "familyAngle" = EXCLUDED."familyAngle",
  "statement" = EXCLUDED."statement",
  "explanation" = EXCLUDED."explanation",
  "commonTrap" = EXCLUDED."commonTrap",
  "qualityScore" = EXCLUDED."qualityScore",
  "regulationVersion" = EXCLUDED."regulationVersion",
  "lastReviewedAt" = EXCLUDED."lastReviewedAt",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "QuestionOption" ("id", "stableKey", "text", "isCorrect", "distractorReason", "questionId") VALUES
  ('Q-I-001-A', 'A', 'Aceitar, desde que a procuração tenha prazo inferior a 30 dias.', false, 'A norma não cria exceção baseada no prazo da procuração.', 'Q-I-001'),
  ('Q-I-001-B', 'B', 'Recusar, pois o assessor não pode representar clientes perante intermediários.', true, NULL, 'Q-I-001'),
  ('Q-I-001-C', 'C', 'Aceitar, desde que o intermediário seja previamente comunicado.', false, 'A comunicação ao intermediário não afasta a vedação.', 'Q-I-001'),
  ('Q-I-001-D', 'D', 'Recusar somente se a procuração permitir operações com derivativos.', false, 'A vedação vale para quaisquer fins, não apenas para derivativos.', 'Q-I-001'),
  ('Q-III-001-A', 'A', 'Recusar automaticamente qualquer relacionamento comercial.', false, 'A classificação elevada não determina recusa automática; o risco deve ser avaliado e mitigado.', 'Q-III-001'),
  ('Q-III-001-B', 'B', 'Aplicar controles idênticos aos de clientes de baixo risco.', false, 'Controles idênticos contrariam a proporcionalidade da abordagem baseada em risco.', 'Q-III-001'),
  ('Q-III-001-C', 'C', 'Dispensar o monitoramento quando a origem dos recursos for declarada.', false, 'A declaração não elimina o dever de diligência e monitoramento.', 'Q-III-001'),
  ('Q-III-001-D', 'D', 'Aplicar medidas de diligência e monitoramento compatíveis com o risco identificado.', true, NULL, 'Q-III-001'),
  ('Q-VIII-001-A', 'A', 'Distribuição primária em uma oferta subsequente.', true, NULL, 'Q-VIII-001'),
  ('Q-VIII-001-B', 'B', 'Distribuição secundária em uma oferta subsequente.', false, 'Na distribuição secundária os recursos vão ao vendedor dos valores mobiliários existentes.', 'Q-VIII-001'),
  ('Q-VIII-001-C', 'C', 'Distribuição primária necessariamente realizada por IPO.', false, 'Uma emissão primária também pode ocorrer após a listagem, em oferta subsequente.', 'Q-VIII-001'),
  ('Q-VIII-001-D', 'D', 'Negociação secundária em bolsa entre investidores.', false, 'O caso descreve emissão de novas ações pela companhia, não negociação entre investidores.', 'Q-VIII-001'),
  ('Q-XIII-001-A', 'A', 'R$ 10.100,00', false, 'Considera somente um período de rendimento.', 'Q-XIII-001'),
  ('Q-XIII-001-B', 'B', 'R$ 10.200,00', false, 'Aplica juros simples e ignora juros sobre juros.', 'Q-XIII-001'),
  ('Q-XIII-001-C', 'C', 'R$ 10.201,00', true, NULL, 'Q-XIII-001'),
  ('Q-XIII-001-D', 'D', 'R$ 10.210,00', false, 'Aplica incorretamente o fator de capitalização.', 'Q-XIII-001'),
  ('Q-XV-001-A', 'A', 'Vender contratos futuros de dólar.', false, 'A posição vendida tende a perder quando o dólar sobe.', 'Q-XV-001'),
  ('Q-XV-001-B', 'B', 'Comprar contratos futuros de dólar.', true, NULL, 'Q-XV-001'),
  ('Q-XV-001-C', 'C', 'Vender opções de compra de dólar sem cobertura.', false, 'A posição adiciona risco de alta e não trava adequadamente o custo da importação.', 'Q-XV-001'),
  ('Q-XV-001-D', 'D', 'Comprar contratos futuros de índice de ações.', false, 'O ativo objeto não corresponde à exposição cambial da empresa.', 'Q-XV-001')
ON CONFLICT ("questionId", "stableKey") DO UPDATE SET
  "text" = EXCLUDED."text",
  "isCorrect" = EXCLUDED."isCorrect",
  "distractorReason" = EXCLUDED."distractorReason";

INSERT INTO "QuestionSource" ("id", "questionId", "regulationVersionId", "locator", "checkedAt") VALUES
  ('source-Q-I-001', 'Q-I-001', 'reg-cvm-178-2023', 'Art. 25, inciso II', TIMESTAMPTZ '2026-10-04 00:00:00-03'),
  ('source-Q-III-001', 'Q-III-001', 'reg-cvm-50-consolidada', 'Art. 4º, caput e incisos I e II', TIMESTAMPTZ '2026-10-04 00:00:00-03'),
  ('source-Q-VIII-001', 'Q-VIII-001', 'reg-cvm-160-consolidada', 'Art. 2º, inciso XIV, alíneas a e b', TIMESTAMPTZ '2026-10-04 00:00:00-03'),
  ('source-Q-XIII-001', 'Q-XIII-001', 'reg-bcb-educacao-compostos', 'Capítulo 3, seção Juros simples e compostos', TIMESTAMPTZ '2026-10-04 00:00:00-03'),
  ('source-Q-XV-001', 'Q-XV-001', 'reg-b3-futuro-dolar', 'Seção Hedge ou estratégia de proteção?', TIMESTAMPTZ '2026-10-04 00:00:00-03')
ON CONFLICT ("id") DO UPDATE SET
  "regulationVersionId" = EXCLUDED."regulationVersionId",
  "locator" = EXCLUDED."locator",
  "checkedAt" = EXCLUDED."checkedAt";
