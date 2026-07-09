module.exports = async function create(req, res) {
  const { name, description, plannedSpending } = req.body;

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

  const group = await Group.create({
    name: name.trim(),
    description: description ? description.trim() : null,
    owner: req.user.id,
    plannedSpending: plannedSpendingFields.plannedSpending,
    plannedSpendingHistory: plannedSpendingFields.plannedSpendingHistory,
  }).fetch();

  await GroupMember.create({ group: group.id, user: req.user.id });

  return res.status(201).json({
    group: sails.services.groupservice.serializeGroup(group, req.user.id, 1),
  });
};
