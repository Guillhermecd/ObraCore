module.exports = async function create(req, res) {
  const {
    name,
    description,
    plannedSpending,
    tipoObra,
    valorContrato,
    situacao,
    valorFechamento,
  } = req.body;

  if (!name || !name.trim()) {
    return res.badRequest({ message: 'Nome do grupo é obrigatório.' });
  }

  const plannedSpendingFields = sails.services.groupservice.buildPlannedSpendingOnCreate(
    plannedSpending,
    req.user,
  );
  if (plannedSpendingFields.error) {
    return res.badRequest({ message: plannedSpendingFields.error });
  }

  const obraFields = sails.services.groupservice.resolveObraFields(tipoObra, valorContrato, null);
  if (obraFields.error) {
    return res.badRequest({ message: obraFields.error });
  }

  const situacaoFields = sails.services.groupservice.resolveSituacao(situacao, valorFechamento, null);
  if (situacaoFields.error) {
    return res.badRequest({ message: situacaoFields.error });
  }

  const group = await Group.create({
    name: name.trim(),
    description: description ? description.trim() : null,
    owner: req.user.id,
    memberIds: [req.user.id],
    plannedSpending: plannedSpendingFields.plannedSpending,
    plannedSpendingHistory: plannedSpendingFields.plannedSpendingHistory,
    ...obraFields,
    ...situacaoFields,
  }).fetch();

  const groupIds = Array.isArray(req.userRecord.groupIds) ? req.userRecord.groupIds : [];
  await User.updateOne({ id: req.user.id }).set({ groupIds: [...groupIds, group.id] });

  return res.status(201).json({
    group: sails.services.groupservice.serializeGroup(group, req.user.id),
  });
};
