const test = require('node:test');
const assert = require('node:assert/strict');

const DashboardService = require('../api/services/DashboardService');

// Fixture principal: os mesmos números do dicionário de métricas (Fase 0) —
// custo realizado R$ 59.489,52 / orçamento R$ 163.750,00 = 36,33% consumido.
// Inclui uma SAIDA pendente (sem `dataRealizada`) de R$ 5.000 que, se
// contada por engano, reproduz exatamente o bug relatado (saldo em caixa
// R$ 60.510,48 em vez do correto R$ 65.510,48).
const OBRA = { id: 'g1', name: 'Obra Teste', isPersonal: false, plannedSpending: 163750 };

const OBRA_EXPENSES = [
  { groupId: 'g1', tipo: 'SAIDA', amount: 50000, dataRealizada: '2026-01-10' },
  { groupId: 'g1', tipo: 'SAIDA', amount: 9489.52, dataRealizada: '2026-02-10' },
  // Pendente: não tem dataRealizada, não pode entrar no custo realizado.
  { groupId: 'g1', tipo: 'SAIDA', amount: 5000, dataRealizada: null, dataPrevista: '2026-03-01' },
  { groupId: 'g1', tipo: 'ENTRADA', amount: 125000, dataRealizada: '2026-01-05' },
];

test('custo realizado ignora SAIDA pendente (sem dataRealizada) — pega o bug dos R$ 5.000', () => {
  const metrics = DashboardService.computeGroupMetrics(OBRA, OBRA_EXPENSES);
  assert.equal(metrics.custoReal, 59489.52);
});

test('saldoOrcamento == orçamento previsto − custo realizado', () => {
  const metrics = DashboardService.computeGroupMetrics(OBRA, OBRA_EXPENSES);
  // Mesmo round2 que o endpoint /obra aplica ao expor este campo — a
  // subtração pura já é o suficiente para reproduzir drift de ponto
  // flutuante (163750 - 59489.52 = 104260.48000000001 sem arredondar).
  const saldoOrcamento = DashboardService.round2(metrics.gastoPlanejado - metrics.custoReal);
  assert.equal(saldoOrcamento, 104260.48);
});

test('consumidoPct == custo realizado / orçamento previsto, 2 casas', () => {
  const metrics = DashboardService.computeGroupMetrics(OBRA, OBRA_EXPENSES);
  assert.equal(metrics.consumidoPct, 36.33);
});

test('saldoEmCaixa (saldoAtual) == total aportado − custo realizado', () => {
  const metrics = DashboardService.computeGroupMetrics(OBRA, OBRA_EXPENSES);
  assert.equal(metrics.totalAportado, 125000);
  assert.equal(metrics.saldoAtual, 65510.48);
  // Regressão explícita: 60.510,48 é o valor que o bug antigo produzia ao
  // incluir a SAIDA pendente de R$ 5.000 no custo realizado.
  assert.notEqual(metrics.saldoAtual, 60510.48);
});

test('equivalência entre fontes: computeProjectPerformance e buildAlerts usam o mesmo consumidoPct', () => {
  const performance = DashboardService.computeProjectPerformance([OBRA], OBRA_EXPENSES)[0];
  const [alert] = DashboardService.buildAlerts([OBRA], OBRA_EXPENSES);

  assert.equal(performance.consumidoPct, alert.consumidoPct);
  assert.equal(performance.consumidoPct, 36.33);
});

test('limiar de risco (>=80%) não diverge entre alerts e projects-performance perto da borda', () => {
  // custoReal/plannedSpending = 79,6% — antes, buildAlerts arredondava para
  // inteiro (Math.round(79.6) = 80) e disparava risco, enquanto
  // computeProjectPerformance (2 casas, 79.6 < 80) não disparava. Agora os
  // dois usam o mesmo consumidoPct de 2 casas e concordam.
  const group = { id: 'g2', name: 'Grupo Borda', isPersonal: false, plannedSpending: 1000 };
  const expenses = [
    { groupId: 'g2', tipo: 'SAIDA', amount: 796, dataRealizada: '2026-01-01' },
    // pendência para satisfazer a condição "existem saídas previstas"
    { groupId: 'g2', tipo: 'SAIDA', amount: 50, dataRealizada: null, dataPrevista: '2026-02-01' },
    // aporte que cobre todo o orçamento — sem isso o alerta que dispara é o
    // de caixa insuficiente, e o limiar de 80% nem seria exercitado.
    { groupId: 'g2', tipo: 'ENTRADA', amount: 1000, dataRealizada: '2026-01-01' },
  ];

  const performance = DashboardService.computeProjectPerformance([group], expenses)[0];
  const alerts = DashboardService.buildAlerts([group], expenses);

  assert.equal(performance.consumidoPct, 79.6);
  assert.equal(performance.status, 'no_prazo');
  // 79,6% < 80 e o caixa cobre o orçamento: nenhuma exceção, nenhum alerta.
  assert.deepEqual(alerts, []);
});

test('buildAlerts não emite mais nível "success" — alerta é exceção, não status', () => {
  const group = { id: 'g7', name: 'Obra saudável', isPersonal: false, plannedSpending: 1000 };
  const expenses = [
    { groupId: 'g7', tipo: 'ENTRADA', amount: 1000, dataRealizada: '2026-01-01' },
    { groupId: 'g7', tipo: 'SAIDA', amount: 100, dataRealizada: '2026-01-02' },
  ];

  const alerts = DashboardService.buildAlerts([group], expenses);
  assert.deepEqual(alerts, []);
});

test('alerta de caixa insuficiente informa quanto falta na obra', () => {
  const group = { id: 'g8', name: 'Obra descoberta', isPersonal: false, plannedSpending: 100000 };
  const expenses = [
    { groupId: 'g8', tipo: 'ENTRADA', amount: 30000, dataRealizada: '2026-01-01' },
    { groupId: 'g8', tipo: 'SAIDA', amount: 20000, dataRealizada: '2026-01-02' },
  ];

  const [alert] = DashboardService.buildAlerts([group], expenses);
  assert.equal(alert.nivel, 'warning');
  assert.equal(alert.titulo, 'Caixa não cobre o orçamento restante');
  // Falta = orçamento − aportado = 100.000 − 30.000.
  assert.equal(alert.valor, 70000);
});

test('grupo sem orçamento definido, mas com movimento real, vira "sem_orcamento"', () => {
  const group = { id: 'g3', name: 'Sem orçamento', isPersonal: false, plannedSpending: 0 };
  const expenses = [{ groupId: 'g3', tipo: 'SAIDA', amount: 100, dataRealizada: '2026-01-01' }];
  const performance = DashboardService.computeProjectPerformance([group], expenses)[0];
  assert.equal(performance.gastoPlanejado, null);
  assert.equal(performance.consumidoPct, null);
  assert.equal(performance.status, 'sem_orcamento');
});

test('filterByPeriod devolve só realizados dentro de [from, to], inclusive', () => {
  const expenses = [
    { tipo: 'SAIDA', amount: 10, dataRealizada: '2026-01-05' },
    { tipo: 'SAIDA', amount: 20, dataRealizada: '2026-01-15' },
    { tipo: 'SAIDA', amount: 30, dataRealizada: '2026-01-31' },
    { tipo: 'SAIDA', amount: 999, dataRealizada: null }, // pendente, sempre excluído
  ];

  const filtered = DashboardService.filterByPeriod(expenses, '2026-01-05', '2026-01-15');
  assert.deepEqual(
    filtered.map((expense) => expense.amount),
    [10, 20],
  );
});

test('filterByPeriod sem from/to ainda exclui pendentes (regressão: early-return vazava tudo)', () => {
  // Bug real encontrado em teste manual do endpoint /obra sem filtro de
  // período: um early-return pra "sem from/to, devolve tudo" pulava o
  // isRealizada por completo, vazando a SAIDA pendente pra composição,
  // evolução mensal e top fornecedores.
  const expenses = [
    { tipo: 'SAIDA', amount: 10, dataRealizada: '2026-01-05' },
    { tipo: 'SAIDA', amount: 999, dataRealizada: null },
  ];

  const filtered = DashboardService.filterByPeriod(expenses, undefined, undefined);
  assert.deepEqual(
    filtered.map((expense) => expense.amount),
    [10],
  );
});

test('buildBreakdown agrupa e soma por chave, ordenado do maior para o menor', () => {
  const expenses = [
    { amount: 100, categoria: 'Material' },
    { amount: 300, categoria: 'Mão de obra' },
    { amount: 50, categoria: 'Material' },
  ];

  const breakdown = DashboardService.buildBreakdown(expenses, (expense) => expense.categoria);
  assert.deepEqual(breakdown, [
    { nome: 'Mão de obra', valor: 300 },
    { nome: 'Material', valor: 150 },
  ]);
});

test('buildMonthlyEvolution agrupa por competência YYYY-MM, ordenado cronologicamente', () => {
  const expenses = [
    { amount: 100, dataRealizada: '2026-02-10' },
    { amount: 50, dataRealizada: '2026-01-20' },
    { amount: 25, dataRealizada: '2026-01-05' },
  ];

  const evolucao = DashboardService.buildMonthlyEvolution(expenses);
  assert.deepEqual(evolucao, [
    { mes: '2026-01', valor: 75 },
    { mes: '2026-02', valor: 100 },
  ]);
});

test('buildTopSuppliers soma total e contagem por fornecedor, limitado e ordenado desc', () => {
  const expenses = [
    { amount: 100, supplier: 'Fornecedor A' },
    { amount: 200, supplier: 'Fornecedor B' },
    { amount: 50, supplier: 'Fornecedor A' },
  ];

  const top = DashboardService.buildTopSuppliers(expenses, 1);
  assert.deepEqual(top, [{ nome: 'Fornecedor B', total: 200, count: 1 }]);
});

test('status "sem_movimento" quando não há nenhum lançamento realizado (nem custo, nem aporte)', () => {
  // Ex.: o grupo "Pessoal", que nunca tem orçamento — hoje isso já cai em
  // "sem_orcamento", mas um grupo COM orçamento definido e zero atividade
  // também não deveria ostentar o badge verde "No prazo": nada aconteceu
  // ainda pra dizer que "está tudo bem".
  const groupComOrcamento = { id: 'g4', name: 'Obra nova', isPersonal: false, plannedSpending: 50000 };
  const groupSemOrcamento = { id: 'g5', name: 'Pessoal', isPersonal: true, plannedSpending: 0 };

  const [semMovimentoComOrcamento] = DashboardService.computeProjectPerformance(
    [groupComOrcamento],
    [],
  );
  const [semMovimentoSemOrcamento] = DashboardService.computeProjectPerformance(
    [groupSemOrcamento],
    [],
  );

  assert.equal(semMovimentoComOrcamento.status, 'sem_movimento');
  assert.equal(semMovimentoSemOrcamento.status, 'sem_movimento');
});

test('status volta a ser "no_prazo"/"sem_orcamento" assim que há movimento real', () => {
  const groupComOrcamento = { id: 'g6', name: 'Obra ativa', isPersonal: false, plannedSpending: 50000 };
  const expenses = [{ groupId: 'g6', tipo: 'SAIDA', amount: 100, dataRealizada: '2026-01-01' }];

  const [performance] = DashboardService.computeProjectPerformance([groupComOrcamento], expenses);
  assert.equal(performance.status, 'no_prazo');
});

// --- Fase 1: orçamento, caixa, ritmo e contrato -------------------------

// Data-base fixa para tudo que depende de "últimos 3 meses civis completos":
// 15/04/2026 -> janela = jan, fev e mar de 2026.
const REF = new Date(Date.UTC(2026, 3, 15));

test('saidasPendentes é o VALOR fora do realizado, não a contagem', () => {
  const metrics = DashboardService.computeGroupMetrics(OBRA, OBRA_EXPENSES, REF);
  assert.equal(metrics.pendencias, 1);
  assert.equal(metrics.saidasPendentes, 5000);
});

test('aporteAFazer = orçamento − aportado; o termo custoReal se cancela', () => {
  const metrics = DashboardService.computeGroupMetrics(OBRA, OBRA_EXPENSES, REF);
  // 163.750 − 125.000. Igual a orcamentoRestante − saldoAtual, por construção.
  assert.equal(metrics.aporteAFazer, 38750);
  assert.equal(
    metrics.aporteAFazer,
    DashboardService.round2(metrics.orcamentoRestante - metrics.saldoAtual),
  );
});

test('aporteAFazer é zero quando o caixa já cobre o orçamento inteiro', () => {
  const group = { id: 'gc', name: 'Obra financiada', isPersonal: false, plannedSpending: 1000 };
  const expenses = [
    { groupId: 'gc', tipo: 'ENTRADA', amount: 1500, dataRealizada: '2026-01-01' },
    { groupId: 'gc', tipo: 'SAIDA', amount: 200, dataRealizada: '2026-01-02' },
  ];

  const metrics = DashboardService.computeGroupMetrics(group, expenses, REF);
  assert.equal(metrics.aporteAFazer, 0);
  // Caixa 1.300 sobre orçamento restante 800 = 162,5% de cobertura.
  assert.equal(metrics.coberturaPct, 162.5);
});

test('obra sem orçamento: avanco, consumidoPct e coberturaPct são null, nunca 0', () => {
  const group = { id: 'gs', name: 'Sem orçamento', isPersonal: false, plannedSpending: 0 };
  const expenses = [{ groupId: 'gs', tipo: 'SAIDA', amount: 100, dataRealizada: '2026-01-01' }];

  const metrics = DashboardService.computeGroupMetrics(group, expenses, REF);
  assert.equal(metrics.consumidoPct, null);
  assert.equal(metrics.avanco, null);
  assert.equal(metrics.coberturaPct, null);
  assert.equal(metrics.mesEsgotamentoOrcamento, null);
});

test('gasto médio mensal usa os 3 meses civis completos, ignorando o mês corrente parcial', () => {
  const group = { id: 'gr', name: 'Obra com ritmo', isPersonal: false, plannedSpending: 100000 };
  const expenses = [
    { groupId: 'gr', tipo: 'SAIDA', amount: 3000, dataRealizada: '2026-01-10' },
    { groupId: 'gr', tipo: 'SAIDA', amount: 3000, dataRealizada: '2026-02-10' },
    { groupId: 'gr', tipo: 'SAIDA', amount: 3000, dataRealizada: '2026-03-10' },
    // Abril é o mês corrente (parcial) — não entra na média, senão a média
    // despencaria no dia 1º de cada mês sem nada ter mudado na obra.
    { groupId: 'gr', tipo: 'SAIDA', amount: 9000, dataRealizada: '2026-04-02' },
    // Dezembro está fora da janela de 3 meses.
    { groupId: 'gr', tipo: 'SAIDA', amount: 90000, dataRealizada: '2025-12-10' },
  ];

  const metrics = DashboardService.computeGroupMetrics(group, expenses, REF);
  assert.equal(metrics.gastoMedioMensal, 3000);
});

test('fôlego de caixa e mês de esgotamento saem do ritmo dos últimos 3 meses', () => {
  const group = { id: 'gf', name: 'Obra em curso', isPersonal: false, plannedSpending: 30000 };
  const expenses = [
    { groupId: 'gf', tipo: 'ENTRADA', amount: 21000, dataRealizada: '2026-01-01' },
    { groupId: 'gf', tipo: 'SAIDA', amount: 3000, dataRealizada: '2026-01-10' },
    { groupId: 'gf', tipo: 'SAIDA', amount: 3000, dataRealizada: '2026-02-10' },
    { groupId: 'gf', tipo: 'SAIDA', amount: 3000, dataRealizada: '2026-03-10' },
  ];

  const metrics = DashboardService.computeGroupMetrics(group, expenses, REF);
  assert.equal(metrics.gastoMedioMensal, 3000);
  // Caixa 12.000 / 3.000 por mês = 4 meses de fôlego.
  assert.equal(metrics.folegoMeses, 4);
  // Restam 21.000 de orçamento / 3.000 = 7 meses -> novembro/2026.
  assert.equal(metrics.mesEsgotamentoOrcamento, '2026-11');
});

test('obra sem ritmo de gasto não inventa fôlego nem data de aporte', () => {
  const group = { id: 'gz', name: 'Obra parada', isPersonal: false, plannedSpending: 1000 };
  const expenses = [{ groupId: 'gz', tipo: 'ENTRADA', amount: 500, dataRealizada: '2026-01-01' }];

  const metrics = DashboardService.computeGroupMetrics(group, expenses, REF);
  assert.equal(metrics.gastoMedioMensal, 0);
  assert.equal(metrics.folegoMeses, null);
  assert.equal(metrics.dataProximoAporte, null);
});

test('obra CLIENTE sem contrato informado: receita e lucro são null, nunca 0', () => {
  // Exibir 0 aqui viraria "lucro zero" ou margem negativa na tela — o card
  // precisa cair no estado de "informe o contrato", não mostrar número.
  const group = {
    id: 'gcl',
    name: 'Cliente sem contrato',
    isPersonal: false,
    plannedSpending: 1000,
    tipoObra: 'CLIENTE',
    valorContrato: null,
  };
  const expenses = [{ groupId: 'gcl', tipo: 'SAIDA', amount: 400, dataRealizada: '2026-01-01' }];

  const metrics = DashboardService.computeGroupMetrics(group, expenses, REF);
  assert.equal(metrics.receitaReconhecida, null);
  assert.equal(metrics.lucroReconhecido, null);
  assert.equal(metrics.margemPct, null);
});

test('obra PROPRIA nunca reconhece receita, mesmo com valorContrato gravado', () => {
  const group = {
    id: 'gp',
    name: 'Obra própria',
    isPersonal: false,
    plannedSpending: 1000,
    tipoObra: 'PROPRIA',
    valorContrato: 5000,
  };
  const expenses = [{ groupId: 'gp', tipo: 'SAIDA', amount: 400, dataRealizada: '2026-01-01' }];

  const metrics = DashboardService.computeGroupMetrics(group, expenses, REF);
  assert.equal(metrics.valorContrato, null);
  assert.equal(metrics.receitaReconhecida, null);
});

test('receita custo-sobre-custo: contrato × avanço, com lucro e margem coerentes', () => {
  const group = {
    id: 'gcc',
    name: 'Obra de cliente',
    isPersonal: false,
    plannedSpending: 80000,
    tipoObra: 'CLIENTE',
    valorContrato: 100000,
  };
  const expenses = [{ groupId: 'gcc', tipo: 'SAIDA', amount: 40000, dataRealizada: '2026-01-01' }];

  const metrics = DashboardService.computeGroupMetrics(group, expenses, REF);
  assert.equal(metrics.avanco, 50); // 40.000 / 80.000
  assert.equal(metrics.receitaReconhecida, 50000); // 100.000 × 50%
  assert.equal(metrics.lucroReconhecido, 10000); // 50.000 − 40.000
  assert.equal(metrics.margemPct, 20);
  // Margem na conclusão: (100.000 − 80.000) / 100.000.
  assert.equal(metrics.margemPrevistaPct, 20);
});

test('avanço trava em 100% ao estourar o orçamento — receita não passa do contrato', () => {
  const group = {
    id: 'gov',
    name: 'Obra estourada',
    isPersonal: false,
    plannedSpending: 80000,
    tipoObra: 'CLIENTE',
    valorContrato: 100000,
  };
  const expenses = [{ groupId: 'gov', tipo: 'SAIDA', amount: 120000, dataRealizada: '2026-01-01' }];

  const metrics = DashboardService.computeGroupMetrics(group, expenses, REF);
  assert.equal(metrics.consumidoPct, 150);
  assert.equal(metrics.avanco, 100);
  assert.equal(metrics.receitaReconhecida, 100000);
  // Prejuízo real aparece como lucro negativo, e não some no teto.
  assert.equal(metrics.lucroReconhecido, -20000);
});

test('obras são ordenadas por urgência de aporte, não por ordem de cadastro', () => {
  const groups = [
    { id: 'a', name: 'Tranquila', isPersonal: false, plannedSpending: 1000 },
    { id: 'b', name: 'Urgente', isPersonal: false, plannedSpending: 100000 },
  ];
  const expenses = [
    { groupId: 'a', tipo: 'ENTRADA', amount: 1000, dataRealizada: '2026-01-01' },
    { groupId: 'b', tipo: 'ENTRADA', amount: 1000, dataRealizada: '2026-01-01' },
  ];

  const performance = DashboardService.computeProjectPerformance(groups, expenses);
  assert.deepEqual(
    performance.map((projeto) => projeto.nome),
    ['Urgente', 'Tranquila'],
  );
});

test('caixa livre não sobe por causa de obra com caixa negativo', () => {
  // Sem o piso em 0 por obra, a obra negativa reduziria o comprometido e
  // inflaria o caixa livre — justamente o número mais honesto da tela.
  const groups = [
    { id: 'ok', name: 'Obra ok', isPersonal: false, plannedSpending: 10000 },
    { id: 'neg', name: 'Obra no vermelho', isPersonal: false, plannedSpending: 10000 },
  ];
  const expenses = [
    { groupId: 'ok', tipo: 'ENTRADA', amount: 8000, dataRealizada: '2026-01-01' },
    { groupId: 'ok', tipo: 'SAIDA', amount: 3000, dataRealizada: '2026-01-02' },
    { groupId: 'neg', tipo: 'SAIDA', amount: 2000, dataRealizada: '2026-01-02' },
  ];

  const projetos = DashboardService.computeProjectPerformance(groups, expenses);
  const caixa = DashboardService.computeCaixaConsolidado(projetos);

  // Saldos: +5.000 e −2.000.
  assert.equal(caixa.saldoTotal, 3000);
  // Comprometido: min(7.000, 5.000)=5.000 na primeira; max(0, ...)=0 na negativa.
  assert.equal(caixa.caixaComprometido, 5000);
  assert.equal(caixa.caixaLivre, -2000);
});

test('resultado consolidado ignora obra própria e só soma obra de cliente com contrato', () => {
  const groups = [
    {
      id: 'cli',
      name: 'Cliente',
      isPersonal: false,
      plannedSpending: 80000,
      tipoObra: 'CLIENTE',
      valorContrato: 100000,
    },
    { id: 'pro', name: 'Própria', isPersonal: false, plannedSpending: 50000, tipoObra: 'PROPRIA' },
  ];
  const expenses = [
    { groupId: 'cli', tipo: 'SAIDA', amount: 40000, dataRealizada: '2026-01-01' },
    { groupId: 'pro', tipo: 'SAIDA', amount: 25000, dataRealizada: '2026-01-01' },
  ];

  const projetos = DashboardService.computeProjectPerformance(groups, expenses);
  const resultado = DashboardService.computeResultadoConsolidado(projetos);

  assert.equal(resultado.contratosAtivos, 1);
  assert.equal(resultado.receitaReconhecida, 50000);
  // Os 25.000 da obra própria NÃO entram no custo do resultado.
  assert.equal(resultado.custoRealizado, 40000);
  assert.equal(resultado.lucroReconhecido, 10000);
  assert.equal(resultado.margemPct, 20);
});

test('resultado consolidado exclui obra CONCLUIDO — ela mora só em lucro realizado, nunca nos dois blocos', () => {
  const groups = [
    {
      id: 'ativa',
      name: 'Obra ativa',
      isPersonal: false,
      plannedSpending: 80000,
      tipoObra: 'CLIENTE',
      valorContrato: 100000,
    },
    {
      id: 'concluida',
      name: 'Obra concluída',
      isPersonal: false,
      plannedSpending: 70000,
      tipoObra: 'CLIENTE',
      valorContrato: 90000,
      situacao: 'CONCLUIDO',
      valorFechamento: 90000,
    },
  ];
  const expenses = [
    { groupId: 'ativa', tipo: 'SAIDA', amount: 40000, dataRealizada: '2026-01-01' },
    { groupId: 'concluida', tipo: 'SAIDA', amount: 62400, dataRealizada: '2026-01-01' },
  ];

  const projetos = DashboardService.computeProjectPerformance(groups, expenses);
  const resultado = DashboardService.computeResultadoConsolidado(projetos);
  const resultadoRealizado = DashboardService.computeResultadoRealizado(projetos);

  // Só a obra ativa entra no Resultado — a concluída não contribui nem um
  // pouco, mesmo tendo receita reconhecida calculável.
  assert.equal(resultado.contratosAtivos, 1);
  assert.equal(resultado.receitaReconhecida, 50000); // 100.000 × 40.000/80.000
  assert.equal(resultado.lucroReconhecido, 10000);

  // A concluída aparece só no Lucro realizado, com o número definitivo.
  assert.equal(resultadoRealizado.obrasConcluidas, 1);
  assert.equal(resultadoRealizado.lucroRealizadoTotal, 27600); // 90.000 − 62.400
});

test('lucro realizado captura o valor de fechamento maior que o contrato original, por inteiro', () => {
  // Cenário do usuário: contrato 150k, orçamento 140k -> lucro previsto
  // 10k. Obra gastou exatamente o orçamento (140k) e fechou vendida por
  // 165k (acima do contrato original) -> lucro final tem que ser 25k, não
  // travar nos 10k previstos pelo contrato.
  const group = {
    id: 'gvenda',
    name: 'Obra vendida acima do contrato',
    isPersonal: false,
    plannedSpending: 140000,
    tipoObra: 'CLIENTE',
    valorContrato: 150000,
    situacao: 'CONCLUIDO',
    valorFechamento: 165000,
  };
  const expenses = [
    { groupId: 'gvenda', tipo: 'SAIDA', amount: 140000, dataRealizada: '2026-01-01' },
  ];

  const metrics = DashboardService.computeGroupMetrics(group, expenses);
  assert.equal(metrics.lucroPrevisto, 10000); // 150.000 − 140.000, referência do dia do contrato
  assert.equal(metrics.lucroRealizado, 25000); // 165.000 − 140.000, definitivo
});

test('obra sem situacao gravada resolve para EM_ANDAMENTO, sem lucro realizado', () => {
  const metrics = DashboardService.computeGroupMetrics(OBRA, OBRA_EXPENSES);
  assert.equal(metrics.situacao, 'EM_ANDAMENTO');
  assert.equal(metrics.valorFechamento, null);
  assert.equal(metrics.lucroRealizado, null);
});

test('lucro realizado == valor de fechamento − custo real, mesmo abaixo do orçamento (diferente do lucro por avanço)', () => {
  // Obra fechou gastando bem menos que o orçamento: avanço fica em 50%, então
  // lucroReconhecido subestima o resultado de uma obra que já terminou. O
  // lucro de fechamento não depende de avanço nem orçamento.
  const group = {
    id: 'gconc',
    name: 'Obra concluída abaixo do orçamento',
    isPersonal: false,
    plannedSpending: 80000,
    tipoObra: 'CLIENTE',
    valorContrato: 100000,
    situacao: 'CONCLUIDO',
    valorFechamento: 100000,
  };
  const expenses = [{ groupId: 'gconc', tipo: 'SAIDA', amount: 40000, dataRealizada: '2026-01-01' }];

  const metrics = DashboardService.computeGroupMetrics(group, expenses, REF);
  assert.equal(metrics.avanco, 50);
  assert.equal(metrics.lucroReconhecido, 10000); // (100.000 × 50%) − 40.000
  assert.equal(metrics.lucroRealizado, 60000); // 100.000 − 40.000
  assert.notEqual(metrics.lucroRealizado, metrics.lucroReconhecido);
});

test('obra PROPRIA concluída também gera lucro realizado, a partir do valor de fechamento informado', () => {
  const group = {
    id: 'gpc',
    name: 'Obra própria vendida',
    isPersonal: false,
    plannedSpending: 50000,
    tipoObra: 'PROPRIA',
    situacao: 'CONCLUIDO',
    valorFechamento: 70000,
  };
  const expenses = [{ groupId: 'gpc', tipo: 'SAIDA', amount: 45000, dataRealizada: '2026-01-01' }];

  const metrics = DashboardService.computeGroupMetrics(group, expenses, REF);
  assert.equal(metrics.valorContrato, null); // obra própria continua sem contrato
  assert.equal(metrics.lucroRealizado, 25000); // 70.000 − 45.000
});

test('obra CONCLUIDO vai para o fim da lista, mesmo com aporte a fazer maior que as demais', () => {
  const groups = [
    {
      id: 'urg',
      name: 'Urgente em andamento',
      isPersonal: false,
      plannedSpending: 100000,
    },
    {
      id: 'fim',
      name: 'Concluída',
      isPersonal: false,
      plannedSpending: 1000,
      situacao: 'CONCLUIDO',
      valorFechamento: 2000,
    },
  ];
  const expenses = [
    { groupId: 'urg', tipo: 'ENTRADA', amount: 1000, dataRealizada: '2026-01-01' },
    { groupId: 'fim', tipo: 'ENTRADA', amount: 1000, dataRealizada: '2026-01-01' },
  ];

  const performance = DashboardService.computeProjectPerformance(groups, expenses);
  assert.deepEqual(
    performance.map((projeto) => projeto.nome),
    ['Urgente em andamento', 'Concluída'],
  );
});

test('resultado realizado soma obra CLIENTE e PROPRIA concluídas, ignora obra em andamento', () => {
  const groups = [
    {
      id: 'c1',
      name: 'Cliente concluída',
      isPersonal: false,
      plannedSpending: 80000,
      tipoObra: 'CLIENTE',
      valorContrato: 100000,
      situacao: 'CONCLUIDO',
      valorFechamento: 100000,
    },
    {
      id: 'p1',
      name: 'Própria concluída',
      isPersonal: false,
      plannedSpending: 50000,
      tipoObra: 'PROPRIA',
      situacao: 'CONCLUIDO',
      valorFechamento: 70000,
    },
    {
      id: 'em1',
      name: 'Em andamento',
      isPersonal: false,
      plannedSpending: 30000,
      tipoObra: 'CLIENTE',
      valorContrato: 40000,
    },
  ];
  const expenses = [
    { groupId: 'c1', tipo: 'SAIDA', amount: 40000, dataRealizada: '2026-01-01' },
    { groupId: 'p1', tipo: 'SAIDA', amount: 45000, dataRealizada: '2026-01-01' },
    { groupId: 'em1', tipo: 'SAIDA', amount: 10000, dataRealizada: '2026-01-01' },
  ];

  const projetos = DashboardService.computeProjectPerformance(groups, expenses);
  const resultadoRealizado = DashboardService.computeResultadoRealizado(projetos);

  assert.equal(resultadoRealizado.obrasConcluidas, 2);
  assert.equal(resultadoRealizado.valorFechamentoTotal, 170000); // 100.000 + 70.000
  assert.equal(resultadoRealizado.custoRealizadoTotal, 85000); // 40.000 + 45.000
  assert.equal(resultadoRealizado.lucroRealizadoTotal, 85000); // 170.000 − 85.000
  assert.equal(resultadoRealizado.margemPct, 50);
});

test('obra recém-criada (orçamento definido, zero lançamentos) não gera alerta de caixa', () => {
  // Regressão direta do bug relatado: caixa R$0 comparado contra o orçamento
  // inteiro (R$90.000) dispararia "Caixa não cobre o orçamento restante"
  // sempre, no instante em que a obra é criada — antes de qualquer dinheiro
  // ter de fato entrado ou saído.
  const group = {
    id: 'gnovo',
    name: 'Obra recém-criada',
    isPersonal: false,
    plannedSpending: 90000,
    tipoObra: 'CLIENTE',
    valorContrato: 100000,
  };

  const alerts = DashboardService.buildAlerts([group], []);
  assert.deepEqual(alerts, []);
});

test('obra recém-criada não entra no aporte a fazer nem no orçamento restante do caixa consolidado', () => {
  const groups = [
    { id: 'gnovo', name: 'Obra recém-criada', isPersonal: false, plannedSpending: 90000 },
    { id: 'gativa', name: 'Obra com movimento', isPersonal: false, plannedSpending: 10000 },
  ];
  const expenses = [
    { groupId: 'gativa', tipo: 'SAIDA', amount: 2000, dataRealizada: '2026-01-01' },
  ];

  const projetos = DashboardService.computeProjectPerformance(groups, expenses);
  const caixa = DashboardService.computeCaixaConsolidado(projetos);

  // Só a obra com movimento entra no aporte a fazer e no orçamento restante:
  // aporte a fazer 10.000 (nada aportado ainda), orçamento restante
  // 10.000 − 2.000 = 8.000. Os 90.000 da obra nova ficam de fora — se
  // entrassem, aporteTotalAFazer seria 100.000.
  assert.equal(caixa.aporteTotalAFazer, 10000);
  // saldoTotal = 0 (obra nova) + (-2.000) (obra ativa, gastou sem receber
  // ainda) = -2.000; cobertura = saldoTotal / orçamento restante (só da obra
  // ativa) = -2.000 / 8.000.
  assert.equal(caixa.saldoTotal, -2000);
  assert.equal(caixa.coberturaCaixaPct, -25);
});

test('lucroPrevisto == valor esperado − orçamento, para obra CLIENTE e PROPRIA', () => {
  const obraCliente = {
    id: 'gc',
    name: 'Cliente',
    isPersonal: false,
    plannedSpending: 90000,
    tipoObra: 'CLIENTE',
    valorContrato: 100000,
  };
  const obraPropria = {
    id: 'gp',
    name: 'Própria pra vender',
    isPersonal: false,
    plannedSpending: 95000,
    tipoObra: 'PROPRIA',
    valorVendaEsperada: 120000,
  };

  const metricsCliente = DashboardService.computeGroupMetrics(obraCliente, []);
  const metricsPropria = DashboardService.computeGroupMetrics(obraPropria, []);

  assert.equal(metricsCliente.lucroPrevisto, 10000);
  assert.equal(metricsPropria.lucroPrevisto, 25000);
});

test('lucroProjetado == lucroPrevisto no dia 1 (sem nenhuma saída pendente itemizada ainda)', () => {
  // A fórmula ingênua (valorEsperado − saidasPendentes) daria 100.000 de
  // "lucro projetado" aqui — um exagero tão errado quanto o alarme de caixa
  // que estamos corrigindo. O piso no orçamento restante evita isso.
  const group = {
    id: 'gdia1',
    name: 'Obra no dia 1',
    isPersonal: false,
    plannedSpending: 90000,
    tipoObra: 'CLIENTE',
    valorContrato: 100000,
  };

  const metrics = DashboardService.computeGroupMetrics(group, []);
  assert.equal(metrics.custoProjetado, 90000);
  assert.equal(metrics.lucroProjetado, 10000);
  assert.equal(metrics.lucroProjetado, metrics.lucroPrevisto);
});

test('lucroProjetado diverge do previsto só quando o comprometido ultrapassa o orçamento restante', () => {
  const group = {
    id: 'gestouro',
    name: 'Obra com pendência acima do orçamento',
    isPersonal: false,
    plannedSpending: 90000,
    tipoObra: 'CLIENTE',
    valorContrato: 100000,
  };
  // Já gastou 40.000 (restam 50.000 de orçamento), mas já tem 60.000 em
  // saídas pendentes lançadas — 10.000 acima do que resta.
  const expenses = [
    { groupId: 'gestouro', tipo: 'SAIDA', amount: 40000, dataRealizada: '2026-01-01' },
    { groupId: 'gestouro', tipo: 'SAIDA', amount: 60000, dataRealizada: null, dataPrevista: '2026-03-01' },
  ];

  const metrics = DashboardService.computeGroupMetrics(group, expenses);
  assert.equal(metrics.lucroPrevisto, 10000); // não muda, é fixo
  assert.equal(metrics.custoProjetado, 100000); // 40.000 + max(50.000, 60.000)
  assert.equal(metrics.lucroProjetado, 0); // 100.000 − 100.000
  assert.notEqual(metrics.lucroProjetado, metrics.lucroPrevisto);
});

test('obra PROPRIA sem valorVendaEsperada não tem lucro previsto nem projetado', () => {
  const group = {
    id: 'gpsemvenda',
    name: 'Própria sem venda esperada',
    isPersonal: false,
    plannedSpending: 50000,
    tipoObra: 'PROPRIA',
  };

  const metrics = DashboardService.computeGroupMetrics(group, []);
  assert.equal(metrics.lucroPrevisto, null);
  assert.equal(metrics.lucroProjetado, null);
});

test('computeResultadoProjetado soma CLIENTE e PROPRIA em andamento, exclui PLANEJADO e CONCLUIDO', () => {
  const groups = [
    {
      id: 'em-cliente',
      name: 'Cliente em andamento',
      isPersonal: false,
      plannedSpending: 90000,
      tipoObra: 'CLIENTE',
      valorContrato: 100000,
    },
    {
      id: 'em-propria',
      name: 'Própria em andamento',
      isPersonal: false,
      plannedSpending: 95000,
      tipoObra: 'PROPRIA',
      valorVendaEsperada: 120000,
    },
    {
      id: 'planejado',
      name: 'Ainda não começou',
      isPersonal: false,
      plannedSpending: 50000,
      tipoObra: 'CLIENTE',
      valorContrato: 60000,
      situacao: 'PLANEJADO',
    },
    {
      id: 'concluida',
      name: 'Já concluída',
      isPersonal: false,
      plannedSpending: 30000,
      tipoObra: 'CLIENTE',
      valorContrato: 40000,
      situacao: 'CONCLUIDO',
      valorFechamento: 40000,
    },
  ];
  const expenses = [
    { groupId: 'em-cliente', tipo: 'SAIDA', amount: 40000, dataRealizada: '2026-01-01' },
    { groupId: 'em-propria', tipo: 'SAIDA', amount: 20000, dataRealizada: '2026-01-01' },
  ];

  const projetos = DashboardService.computeProjectPerformance(groups, expenses);
  const resultadoProjetado = DashboardService.computeResultadoProjetado(projetos);

  // Só as duas EM_ANDAMENTO entram. custoProjetado de cada uma = custoReal +
  // max(orcamentoRestante, saidasPendentes) = custoReal + orcamentoRestante
  // (sem pendência lançada) = gastoPlanejado em ambas (90.000 e 95.000).
  assert.equal(resultadoProjetado.obrasEmAndamento, 2);
  assert.equal(resultadoProjetado.valorEsperadoTotal, 220000); // 100.000 + 120.000
  assert.equal(resultadoProjetado.custoProjetadoTotal, 185000); // 90.000 + 95.000
  assert.equal(resultadoProjetado.lucroProjetadoTotal, 35000); // 220.000 − 185.000
});

// REF fixo em 23/07/2026 pros testes de período — mesmo "hoje" usado na
// verificação manual do handoff (mês/trimestre/ano dão os mesmos ranges
// citados na tela).
const PERIOD_REF = new Date(Date.UTC(2026, 6, 23));

test('resolvePeriodRange "mes" == 1º dia do mês corrente até hoje', () => {
  const range = DashboardService.resolvePeriodRange('mes', PERIOD_REF);
  assert.deepEqual(range, { from: '2026-07-01', to: '2026-07-23', label: '01 jul → 23 jul 2026' });
});

test('resolvePeriodRange "tri" == hoje menos 3 meses civis até hoje', () => {
  const range = DashboardService.resolvePeriodRange('tri', PERIOD_REF);
  assert.deepEqual(range, { from: '2026-04-23', to: '2026-07-23', label: '23 abr → 23 jul 2026' });
});

test('resolvePeriodRange "ano" == 1º de janeiro do ano corrente até hoje', () => {
  const range = DashboardService.resolvePeriodRange('ano', PERIOD_REF);
  assert.deepEqual(range, { from: '2026-01-01', to: '2026-07-23', label: '01 jan → 23 jul 2026' });
});

test('resolvePreviousPeriodRange "mes" == mês civil anterior inteiro', () => {
  const range = DashboardService.resolvePreviousPeriodRange('mes', PERIOD_REF);
  assert.deepEqual(range, { from: '2026-06-01', to: '2026-06-30', label: '01 jun → 30 jun 2026' });
});

test('resolvePreviousPeriodRange "tri" == os 3 meses civis imediatamente antes do trimestre atual', () => {
  const range = DashboardService.resolvePreviousPeriodRange('tri', PERIOD_REF);
  assert.deepEqual(range, { from: '2026-01-23', to: '2026-04-22', label: '23 jan → 22 abr 2026' });
});

test('resolvePreviousPeriodRange "ano" == ano civil anterior inteiro', () => {
  const range = DashboardService.resolvePreviousPeriodRange('ano', PERIOD_REF);
  assert.deepEqual(range, { from: '2025-01-01', to: '2025-12-31', label: '01 jan → 31 dez 2025' });
});

test('resolvePeriodRange "tudo" == sem início, até hoje, com label literal', () => {
  const range = DashboardService.resolvePeriodRange('tudo', PERIOD_REF);
  assert.deepEqual(range, { from: null, to: '2026-07-23', label: 'Todo o período' });
});

test('computeTrend devolve 12 pontos, em ordem cronológica, terminando no mês de referência', () => {
  const groups = [{ id: 'gt', name: 'Obra', isPersonal: false, plannedSpending: 100000 }];
  const points = DashboardService.computeTrend(groups, [], 12, PERIOD_REF);

  assert.equal(points.length, 12);
  assert.deepEqual(
    points.map((p) => p.mes),
    ['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'],
  );
});

test('computeTrend acumula lucro reconhecido e caixa livre até o fim de cada mês, ignorando o que vem depois', () => {
  const groups = [
    { id: 'gt', name: 'Obra', isPersonal: false, plannedSpending: 100000, tipoObra: 'CLIENTE', valorContrato: 150000 },
  ];
  const expenses = [
    { groupId: 'gt', tipo: 'SAIDA', amount: 20000, dataRealizada: '2026-02-10' },
    { groupId: 'gt', tipo: 'SAIDA', amount: 30000, dataRealizada: '2026-05-10' },
    { groupId: 'gt', tipo: 'ENTRADA', amount: 10000, dataRealizada: '2026-06-01' },
  ];

  const points = DashboardService.computeTrend(groups, expenses, 12, PERIOD_REF);
  const byMonth = Object.fromEntries(points.map((p) => [p.mes, p]));

  // Antes de qualquer lançamento: tudo zerado.
  assert.equal(byMonth['2026-01'].lucroReconhecidoAcumulado, 0);
  assert.equal(byMonth['2026-01'].caixaLivre, 0);

  // Fevereiro: só a SAIDA de 20.000 realizada — avanço 20%, receita 30.000,
  // lucro reconhecido 10.000. Caixa livre = saldoAtual (-20.000, sem aporte).
  assert.equal(byMonth['2026-02'].lucroReconhecidoAcumulado, 10000);
  assert.equal(byMonth['2026-02'].caixaLivre, -20000);

  // Maio: acumula a segunda SAIDA (total 50.000) — avanço 50%, receita
  // 75.000, lucro reconhecido 25.000.
  assert.equal(byMonth['2026-05'].lucroReconhecidoAcumulado, 25000);
  assert.equal(byMonth['2026-05'].caixaLivre, -50000);

  // Julho (mês de referência, parcial): a ENTRADA de junho já entrou, nada
  // novo em julho — lucro reconhecido some igual a maio, caixa livre reflete
  // o aporte de junho.
  assert.equal(byMonth['2026-07'].lucroReconhecidoAcumulado, 25000);
  assert.equal(byMonth['2026-07'].caixaLivre, -40000);
});
