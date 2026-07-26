const VALID_PERIODS = ['mes', 'tri', 'ano', 'tudo'];

function normalizePeriod(raw) {
  return VALID_PERIODS.includes(raw) ? raw : 'tudo';
}

function buildEmptySummary(periodo, periodoRange) {
  return {
    saldoTotal: 0,
    caixaComprometido: 0,
    caixaLivre: 0,
    aporteTotalAFazer: 0,
    coberturaCaixaPct: null,
    periodo,
    periodoRange,
    resultadoDeltaPct: null,
    resultado: {
      contratosAtivos: 0,
      receitaReconhecida: 0,
      custoRealizado: 0,
      lucroReconhecido: 0,
      margemPct: null,
      margemPrevistaPct: null,
    },
    resultadoRealizado: {
      obrasConcluidas: 0,
      valorFechamentoTotal: 0,
      custoRealizadoTotal: 0,
      lucroRealizadoTotal: 0,
      margemPct: null,
    },
    resultadoProjetado: {
      obrasEmAndamento: 0,
      valorEsperadoTotal: 0,
      custoProjetadoTotal: 0,
      lucroProjetadoTotal: 0,
      margemPct: null,
    },
    trend: [],
  };
}

/**
 * Consolidado de caixa e resultado de todas as obras do usuário.
 *
 * Dois escopos de tempo diferentes na mesma resposta (ver hand-off da tela):
 *   - Caixa, Lucro projetado e Lucro realizado são SNAPSHOT/acumulados —
 *     ignoram `?period`, um saldo ou uma previsão não fazem sentido dentro de
 *     uma janela.
 *   - Só `resultado` (lucro reconhecido por avanço) responde a `?period`
 *     (`mes`/`tri`/`ano`/`tudo`, default `tudo`) — reaproveita `filterByPeriod`
 *     sobre as expenses ANTES de rodar `computeProjectPerformance`, no mesmo
 *     padrão já usado em `dashboard/obra.js` pros "flows" filtrados por
 *     período. Em `tudo` não existe janela anterior pra comparar — o delta
 *     comparativo fica `null` (ver bloco abaixo).
 *
 * O grupo Pessoal fica de fora: é registro da própria conta, não uma obra, e
 * incluí-lo distorceria caixa comprometido e cobertura.
 */
module.exports = async function summary(req, res) {
  const dashboardService = sails.services.dashboardservice;
  const groupService = sails.services.groupservice;

  const periodo = normalizePeriod(req.query.period);
  const periodoRange = dashboardService.resolvePeriodRange(periodo);

  const groupIds = groupService.toArray(req.userRecord.groupIds);

  if (groupIds.length === 0) {
    return res.json(buildEmptySummary(periodo, periodoRange));
  }

  const [groups, expenses] = await Promise.all([
    Group.find({ id: { in: groupIds } }),
    Expense.find({ groupId: { in: groupIds } }),
  ]);

  const obras = groups.filter((group) => !group.isPersonal);
  if (obras.length === 0) {
    return res.json(buildEmptySummary(periodo, periodoRange));
  }

  // Snapshot: todas as expenses, sem recorte de período.
  const projetos = dashboardService.computeProjectPerformance(obras, expenses);

  // Caixa é de todas as obras (FISCAL pode ver saldo e aporte). Já os blocos
  // de resultado saem só das obras em que ele tem `viewFinanceiro`: somar
  // tudo e esconder depois daria um consolidado que denuncia o que foi
  // ocultado.
  const obraById = new Map(obras.map((group) => [group.id, group]));
  const podeVerFinanceiro = (projeto) =>
    groupService.can(obraById.get(projeto.id), req.user.id, 'viewFinanceiro');
  const projetosComFinanceiro = projetos.filter(podeVerFinanceiro);

  // Resultado: só a fatia de expenses realizadas dentro da janela do período
  // selecionado — o mesmo `gastoPlanejado` (orçamento inteiro) segue sendo o
  // denominador do avanço, só o custo/receita reconhecida no numerador fica
  // restrito à janela.
  const expensesDoPeriodo = dashboardService.filterByPeriod(
    expenses,
    periodoRange.from,
    periodoRange.to,
  );
  const projetosDoPeriodo = dashboardService
    .computeProjectPerformance(obras, expensesDoPeriodo)
    .filter(podeVerFinanceiro);
  const resultado = dashboardService.computeResultadoConsolidado(projetosDoPeriodo);

  // "tudo" não tem janela anterior de mesma duração pra comparar — pular o
  // cálculo inteiro e deixar o delta null (não zero: zero renderizaria "0%
  // vs. período anterior" na UI, que é uma comparação sem sentido aqui).
  let resultadoDeltaPct = null;
  if (periodo !== 'tudo') {
    const periodoAnteriorRange = dashboardService.resolvePreviousPeriodRange(periodo);
    const expensesPeriodoAnterior = dashboardService.filterByPeriod(
      expenses,
      periodoAnteriorRange.from,
      periodoAnteriorRange.to,
    );
    const projetosPeriodoAnterior = dashboardService
      .computeProjectPerformance(obras, expensesPeriodoAnterior)
      .filter(podeVerFinanceiro);
    const resultadoAnterior = dashboardService.computeResultadoConsolidado(projetosPeriodoAnterior);
    resultadoDeltaPct =
      resultadoAnterior.lucroReconhecido !== 0
        ? dashboardService.round2(
            ((resultado.lucroReconhecido - resultadoAnterior.lucroReconhecido) /
              Math.abs(resultadoAnterior.lucroReconhecido)) *
              100,
          )
        : null;
  }

  // Tendência mistura uma série de caixa (todo mundo vê) com uma de lucro
  // reconhecido (só quem tem `viewFinanceiro`) — roda duas vezes, com o
  // recorte de obras certo em cada uma, e junta por mês. Sem isso, um FISCAL
  // sem acesso a nenhuma obra financeira ainda veria o lucro reconhecido da
  // empresa inteira no gráfico.
  const obrasComFinanceiro = obras.filter((group) =>
    groupService.can(group, req.user.id, 'viewFinanceiro'),
  );
  const trendCaixa = dashboardService.computeTrend(obras, expenses);
  const trendResultado = dashboardService.computeTrend(obrasComFinanceiro, expenses);
  const trend = trendCaixa.map((point, index) => ({
    mes: point.mes,
    caixaLivre: point.caixaLivre,
    lucroReconhecidoAcumulado: trendResultado[index].lucroReconhecidoAcumulado,
  }));

  return res.json({
    ...dashboardService.computeCaixaConsolidado(projetos),
    periodo,
    periodoRange,
    resultado,
    resultadoDeltaPct,
    resultadoRealizado: dashboardService.computeResultadoRealizado(projetosComFinanceiro),
    resultadoProjetado: dashboardService.computeResultadoProjetado(projetosComFinanceiro),
    trend,
  });
};
