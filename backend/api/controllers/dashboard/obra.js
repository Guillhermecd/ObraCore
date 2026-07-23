const TOP_SUPPLIERS_LIMIT = 8;

/**
 * Financeiro de UMA obra (grupo). Substitui toda a matemática que antes era
 * feita no front (`DashboardPage`). Dois grupos de dados, com escopos
 * diferentes de tempo (ver dicionário de métricas, Fase 0):
 *
 *   - KPIs de Orçamento e Caixa: acumulados do projeto (project-to-date),
 *     ignoram `from`/`to` — um saldo/percentual acumulado não faz sentido
 *     dentro de uma janela.
 *   - Flows (composição do gasto, evolução mensal, top fornecedores, custo
 *     médio): respeitam `from`/`to` quando informados.
 */
module.exports = async function obra(req, res) {
  const { groupId, from, to } = req.query;

  if (!groupId || !sails.services.groupservice.isMember(req.userRecord, groupId)) {
    return res.badRequest({ message: 'Obra inválida.' });
  }

  const [group, expenses, categories, sources] = await Promise.all([
    Group.findOne({ id: groupId }),
    Expense.find({ groupId }),
    ExpenseCategory.find({ groupId }),
    ExpenseSource.find({ groupId }),
  ]);

  if (!group) {
    // `res.notFound()` sem argumento manda 404 com corpo vazio (não há view
    // 404 neste projeto), e o front cai no texto genérico. Mesmo formato
    // `{ message }` das outras 18 respostas 404.
    return res.status(404).json({ message: 'Obra não encontrada.' });
  }

  const dashboardService = sails.services.dashboardservice;

  const metrics = dashboardService.computeGroupMetrics(group, expenses);

  const periodExpenses = dashboardService.filterByPeriod(expenses, from, to);
  const saidaRealizadaNoPeriodo = periodExpenses.filter((expense) => expense.tipo === 'SAIDA');

  const qtdLancamentos = saidaRealizadaNoPeriodo.length;
  const custoNoPeriodo = saidaRealizadaNoPeriodo.reduce((sum, expense) => sum + expense.amount, 0);
  const custoMedioLancamento =
    qtdLancamentos > 0 ? dashboardService.round2(custoNoPeriodo / qtdLancamentos) : 0;

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const sourceNameById = new Map(sources.map((source) => [source.id, source.name]));

  const composicao = {
    categoria: dashboardService.buildBreakdown(
      saidaRealizadaNoPeriodo,
      (expense) => categoryNameById.get(expense.categoryId),
    ),
    fonte: dashboardService.buildBreakdown(
      saidaRealizadaNoPeriodo,
      (expense) => sourceNameById.get(expense.sourceId),
    ),
    formaPagamento: dashboardService.buildBreakdown(
      saidaRealizadaNoPeriodo,
      (expense) => expense.paymentMethod,
    ),
  };

  const evolucaoMensal = dashboardService.buildMonthlyEvolution(saidaRealizadaNoPeriodo);
  const topFornecedores = dashboardService.buildTopSuppliers(saidaRealizadaNoPeriodo, TOP_SUPPLIERS_LIMIT);

  // FISCAL vê a obra, mas não o contrato: a redação é aqui, no payload, e não
  // só na UI — esconder na tela e continuar servindo o número pela API não
  // esconde nada.
  const podeVerFinanceiro = sails.services.groupservice.can(group, req.user.id, 'viewFinanceiro');

  return res.json({
    nome: group.name,
    tipoObra: metrics.tipoObra,
    valorContrato: podeVerFinanceiro ? metrics.valorContrato : null,

    // Bloco de orçamento — acumulado do projeto, ignora from/to.
    orcamentoPrevisto: metrics.gastoPlanejado,
    custoRealizado: metrics.custoReal,
    saldoOrcamento: dashboardService.round2(metrics.gastoPlanejado - metrics.custoReal),
    consumidoPct: metrics.consumidoPct,
    saidasPendentes: metrics.saidasPendentes,
    pendencias: metrics.pendencias,

    // Bloco de caixa — acumulado.
    totalAportado: metrics.totalAportado,
    saldoEmCaixa: metrics.saldoAtual,
    aporteAFazer: metrics.aporteAFazer,
    coberturaPct: metrics.coberturaPct,

    // Bloco de ritmo — últimos 3 meses civis completos, extrapolação linear.
    gastoMedioMensal: metrics.gastoMedioMensal,
    folegoMeses: metrics.folegoMeses,
    dataProximoAporte: metrics.dataProximoAporte,
    mesEsgotamentoOrcamento: metrics.mesEsgotamentoOrcamento,

    // Flows — respeitam from/to.
    custoMedioLancamento,
    qtdLancamentos,
    composicao,
    evolucaoMensal,
    topFornecedores,
  });
};
