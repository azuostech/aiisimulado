# Plano de correção da auditoria do banco de 161 questões

Data de referência: 12/10/2026.

## Decisões de implementação

1. Uma família editorial pode conter várias questões, cada uma com um ângulo próprio.
2. Uma prova não pode selecionar duas questões da mesma família.
3. As cotas por tema são rígidas; dificuldade, variedade de subtema e recência são otimizadas globalmente.
4. A seleção não pode depender da ordem dos temas retornada pelo banco.
5. Questões redundantes ou fora do programa ficam arquivadas, preservando histórico e snapshots de sessões antigas.
6. Toda substituição entra com fonte primária, localizador e data de conferência.
7. A expansão para 340 só começa depois de um lote de reescritas reduzir as pistas editoriais e passar por nova amostragem.

## Entregue nesta etapa

- Suporte a múltiplas questões por família, com ângulo armazenado na questão.
- Validação de consistência taxonômica e unicidade de ângulo dentro da família.
- Seleção global determinística com cotas exatas por tema.
- Testes contra repetição de família, escassez e dependência da ordem dos temas.
- Auditor local de dificuldade, cobertura, extensão das alternativas, absolutos e flags de cálculo.
- Correção do gabarito contraditório de `AI-XV-000017`.
- Reclassificação das dificuldades apontadas pela auditoria.
- Atualização das fontes da Resolução CVM 245, clubes de investimento, VaR e liquidação D+2.
- Arquivamento das nove questões JSON marcadas para substituição.
- Inclusão de dez questões substitutas sobre lacunas prioritárias; `Q-III-001` passa a ser arquivada no seed base.
- Finalização de sessão idempotente para recuperar o resultado já persistido após repetição da requisição.
- Detector compartilhado de pistas de gabarito por extensão, proporção e uso assimétrico de absolutos.
- Penalidade editorial dominante no seletor: uma dificuldade declarada maior não compensa uma resposta que denuncia o gabarito.
- Reescrita integral dos bancos ativos dos Temas IV, VIII e XV, com alternativas equilibradas e distratores tecnicamente plausíveis.
- Reescrita do primeiro lote de 20 questões dos Temas I e III que apresentavam penalidade editorial severa; após o gate, esses temas ficaram sem correta destacada por extensão, absolutos assimétricos ou penalidade editorial.
- Reescrita do segundo lote de 24 questões dos Temas VII, XIII e XIV; os três temas ficaram com penalidade editorial zero em todas as questões ativas.
- Início do terceiro lote com a revisão das oito questões ativas do Tema IX; o tema também ficou com penalidade editorial zero.

## Próximo lote editorial

- Reescrever as 27 questões ainda sinalizadas, concluindo o terceiro lote pelos Temas X, XI e XII.
- Priorizar os demais temas e questões em que a correta é isoladamente a mais longa.
- Reduzir absolutos usados apenas nos distratores.
- Produzir famílias com três a seis ângulos para nós de maior peso.
- Criar questões de nível 5 suficientes para tornar viáveis as matrizes Real e Blindagem.
- Auditar um simulado completo de 80 questões antes da expansão definitiva até 340.

## Critérios para liberar a expansão

- zero erro no gate estrutural;
- zero gabarito ambíguo na amostra revisada;
- fontes primárias verificadas nos itens normativos;
- correta isoladamente mais longa em no máximo 10% do lote novo;
- absolutos apenas em distratores em no máximo 10% do lote novo;
- zero questão com penalidade editorial severa no lote novo;
- ao menos três ângulos por família prioritária;
- distribuição de dificuldade alcançável pelo banco ativo;
- geração de dez provas simuladas com relatório de sobreposição.
