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

test('computeTotals soma apenas lançamentos realizados, por tipo', () => {
  const { totalEntrada, totalSaida, saldoGeral } = DashboardService.computeTotals(OBRA_EXPENSES);
  assert.equal(totalEntrada, 125000);
  assert.equal(totalSaida, 59489.52);
  assert.equal(saldoGeral, 65510.48);
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
