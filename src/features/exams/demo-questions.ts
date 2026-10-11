export type DemoOption = {
  id: string;
  text: string;
};

export type DemoQuestion = {
  id: string;
  topic: string;
  topicName: string;
  statement: string;
  options: DemoOption[];
};

export type DemoReviewItem = {
  id: string;
  correctOptionId: string;
  explanation: string;
  source: string;
  isCorrect: boolean;
};

export type DemoSubmissionResult = {
  score: number;
  review: DemoReviewItem[];
};

// Safe to ship to the browser. Answers and explanations stay in the server service.
export const DEMO_QUESTIONS: DemoQuestion[] = [
  { id:"DEMO-I-001", topic:"I", topicName:"Atividade do Assessor", statement:"Uma assessora credenciada recebe de um cliente uma procuração para movimentar livremente sua carteira durante uma viagem. À luz das regras da atividade, qual conduta é adequada?", options:[{id:"a",text:"Aceitar, desde que a procuração tenha prazo inferior a 30 dias."},{id:"b",text:"Recusar, pois é vedado atuar como procuradora ou representante do cliente perante intermediários."},{id:"c",text:"Aceitar, desde que as operações sejam previamente comunicadas ao intermediário."},{id:"d",text:"Recusar apenas se a procuração permitir operações com derivativos."}] },
  { id:"DEMO-III-001", topic:"III", topicName:"PLD/FTP e Suitability", statement:"Ao classificar um cliente como de maior risco de PLD/FTP, uma instituição deve adotar qual abordagem?", options:[{id:"a",text:"Recusar automaticamente qualquer relacionamento comercial."},{id:"b",text:"Aplicar controles idênticos aos de todos os clientes para evitar discriminação."},{id:"c",text:"Dispensar monitoramento quando a origem dos recursos for declarada."},{id:"d",text:"Aplicar diligência e monitoramento reforçados, compatíveis com o risco identificado."}] },
  { id:"DEMO-VIII-001", topic:"VIII", topicName:"Mercado de Capitais", statement:"Uma companhia já listada distribui novas ações ao público para financiar sua expansão. A operação ocorre em qual ambiente?", options:[{id:"a",text:"Mercado primário, por meio de uma oferta subsequente."},{id:"b",text:"Mercado secundário, por meio de uma oferta subsequente."},{id:"c",text:"Mercado primário, necessariamente por meio de um IPO."},{id:"d",text:"Mercado de balcão não organizado, por meio de subscrição privada."}] },
  { id:"DEMO-XIII-001", topic:"XIII", topicName:"Matemática Financeira", statement:"Um capital de R$ 10.000 rende 1% ao mês, sob capitalização composta, durante dois meses. Qual é o valor futuro?", options:[{id:"a",text:"R$ 10.100,00"},{id:"b",text:"R$ 10.200,00"},{id:"c",text:"R$ 10.201,00"},{id:"d",text:"R$ 10.210,00"}] },
  { id:"DEMO-XV-001", topic:"XV", topicName:"Mercados Derivativos", statement:"Uma empresa brasileira terá de pagar uma importação em dólares em 90 dias e teme a valorização da moeda americana. Qual posição é compatível com o hedge pretendido?", options:[{id:"a",text:"Vender contratos futuros de dólar."},{id:"b",text:"Comprar contratos futuros de dólar."},{id:"c",text:"Vender opções de compra de dólar sem cobertura."},{id:"d",text:"Comprar contratos futuros de índice de ações."}] },
];
