module.exports = async function update(req, res) {
  const group = await Group.findOne({ id: req.params.id });

  if (!group || !sails.services.groupservice.isMember(req.userRecord, group.id)) {
    return res.status(404).json({ message: 'Grupo não encontrado.' });
  }

  if (!sails.services.groupservice.can(group, req.user.id, 'editGroup')) {
    return res.status(403).json({ message: 'Apenas o criador do grupo pode editá-lo.' });
  }

  const {
    name,
    description,
    plannedSpending,
    tipoObra,
    valorContrato,
    valorVendaEsperada,
    situacao,
    valorFechamento,
  } = req.body;
  const valuesToSet = {};

  if (name !== undefined) {
    if (!name.trim()) {
      return res.badRequest({ message: 'Nome do grupo é obrigatório.' });
    }
    valuesToSet.name = name.trim();
  }

  if (description !== undefined) {
    valuesToSet.description = description ? description.trim() : null;
  }

  if (plannedSpending !== undefined) {
    const plannedSpendingUpdate = sails.services.groupservice.resolvePlannedSpendingUpdate(
      group,
      plannedSpending,
      req.user,
    );
    if (plannedSpendingUpdate.error) {
      return res.badRequest({ message: plannedSpendingUpdate.error });
    }
    Object.assign(valuesToSet, plannedSpendingUpdate);
  }

  if (tipoObra !== undefined || valorContrato !== undefined || valorVendaEsperada !== undefined) {
    const obraFields = sails.services.groupservice.resolveObraFields(
      tipoObra,
      valorContrato,
      valorVendaEsperada,
      group,
    );
    if (obraFields.error) {
      return res.badRequest({ message: obraFields.error });
    }
    Object.assign(valuesToSet, obraFields);
  }

  if (situacao !== undefined || valorFechamento !== undefined) {
    const situacaoFields = sails.services.groupservice.resolveSituacao(situacao, valorFechamento, group);
    if (situacaoFields.error) {
      return res.badRequest({ message: situacaoFields.error });
    }
    Object.assign(valuesToSet, situacaoFields);
  }

  const updatedGroup = await Group.updateOne({ id: group.id }).set(valuesToSet);

  if (situacao !== undefined || valorFechamento !== undefined) {
    await sails.services.groupservice.syncFechamentoExpense(updatedGroup, req.user.id);
  }

  return res.json({
    group: sails.services.groupservice.serializeGroup(updatedGroup, req.user.id),
  });
};
