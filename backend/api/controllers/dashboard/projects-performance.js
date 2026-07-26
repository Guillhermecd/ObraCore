module.exports = async function projectsPerformance(req, res) {
  const groupIds = sails.services.groupservice.toArray(req.userRecord.groupIds);

  if (groupIds.length === 0) {
    return res.json([]);
  }

  const [groups, expenses] = await Promise.all([
    Group.find({ id: { in: groupIds } }),
    Expense.find({ groupId: { in: groupIds } }),
  ]);

  // Mesmo recorte do bloco de caixa (`dashboard/summary`): o grupo Pessoal é
  // registro da própria conta, não uma obra. Sem esse filtro ele apareceria
  // como card de "obra própria" numa tela cujo saldo consolidado não o inclui.
  const obras = groups.filter((group) => !group.isPersonal);

  const groupService = sails.services.groupservice;
  const projetos = sails.services.dashboardservice.computeProjectPerformance(obras, expenses);

  // A redação é por obra, não por usuário: a mesma pessoa pode ser MASTER na
  // obra dela e FISCAL na obra de outro.
  const obraById = new Map(obras.map((group) => [group.id, group]));

  return res.json(
    projetos.map((projeto) => {
      const group = obraById.get(projeto.id);
      // `myRole` vai junto para o card saber a diferença entre "não há
      // contrato" e "você não pode ver o contrato" — sem ele o fiscal leria
      // "contrato ainda não informado" numa obra que tem contrato.
      const comPapel = { ...projeto, myRole: groupService.roleOf(group, req.user.id) };

      return groupService.can(group, req.user.id, 'viewFinanceiro')
        ? comPapel
        : groupService.redactFinanceiro(comPapel);
    }),
  );
};
