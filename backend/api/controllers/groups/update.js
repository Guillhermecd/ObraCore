module.exports = async function update(req, res) {
  const group = await Group.findOne({ id: req.params.id });

  if (!group || !(await sails.services.groupservice.isMember(req.userRecord, group.id))) {
    return res.status(404).json({ message: 'Grupo não encontrado.' });
  }

  if (group.owner !== req.user.id) {
    return res.status(403).json({ message: 'Apenas o criador do grupo pode editá-lo.' });
  }

  const { name, description, plannedSpending } = req.body;
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

  const updatedGroup = await Group.updateOne({ id: group.id }).set(valuesToSet);
  const memberCount = await GroupMember.count({ group: group.id });

  return res.json({
    group: sails.services.groupservice.serializeGroup(updatedGroup, req.user.id, memberCount),
  });
};
