const EMPTY_SUMMARY = {
  saldoTotal: 0,
  caixaComprometido: 0,
  caixaLivre: 0,
  aporteTotalAFazer: 0,
  coberturaCaixaPct: null,
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
};

/**
 * Consolidado de caixa e resultado de todas as obras do usuário. Todo número
 * aqui é acumulado/ponto-no-tempo — não existe janela de período nem
 * comparativo "vs. período anterior", que não significaria nada sobre um
 * saldo. O filtro de período da tela Consolidado governa só o histórico.
 *
 * O grupo Pessoal fica de fora: é registro da própria conta, não uma obra, e
 * incluí-lo distorceria caixa comprometido e cobertura.
 */
module.exports = async function summary(req, res) {
  const groupIds = Array.isArray(req.userRecord.groupIds) ? req.userRecord.groupIds : [];

  if (groupIds.length === 0) {
    return res.json(EMPTY_SUMMARY);
  }

  const [groups, expenses] = await Promise.all([
    Group.find({ id: { in: groupIds } }),
    Expense.find({ groupId: { in: groupIds } }),
  ]);

  const obras = groups.filter((group) => !group.isPersonal);
  if (obras.length === 0) {
    return res.json(EMPTY_SUMMARY);
  }

  const dashboardService = sails.services.dashboardservice;
  const groupService = sails.services.groupservice;
  const projetos = dashboardService.computeProjectPerformance(obras, expenses);

  // Caixa é de todas as obras (FISCAL pode ver saldo e aporte). Já o bloco de
  // resultado sai só das obras em que ele tem `viewFinanceiro`: somar tudo e
  // esconder depois daria um consolidado que denuncia o que foi ocultado.
  const obraById = new Map(obras.map((group) => [group.id, group]));
  const projetosComFinanceiro = projetos.filter((projeto) =>
    groupService.can(obraById.get(projeto.id), req.user.id, 'viewFinanceiro'),
  );

  return res.json({
    ...dashboardService.computeCaixaConsolidado(projetos),
    resultado: dashboardService.computeResultadoConsolidado(projetosComFinanceiro),
    resultadoRealizado: dashboardService.computeResultadoRealizado(projetosComFinanceiro),
  });
};
