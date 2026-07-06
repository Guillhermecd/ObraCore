module.exports = async function remove(req, res) {
  const group = await Group.findOne({ id: req.params.id });

  if (!group || !sails.services.groupservice.isMember(req.userRecord, group.id)) {
    return res.status(404).json({ message: 'Grupo não encontrado.' });
  }

  if (group.owner !== req.user.id) {
    return res.status(403).json({ message: 'Apenas o criador do grupo pode excluí-lo.' });
  }

  if (group.isPersonal) {
    return res.badRequest({ message: 'O grupo Pessoal não pode ser excluído.' });
  }

  const memberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
  const members = await User.find({ id: { in: memberIds } });

  await Promise.all(
    members.map((member) => {
      const groupIds = Array.isArray(member.groupIds) ? member.groupIds : [];
      return User.updateOne({ id: member.id }).set({
        groupIds: groupIds.filter((id) => id !== group.id),
      });
    }),
  );

  await Promise.all([
    Expense.destroy({ groupId: group.id }),
    ExpenseCategory.destroy({ groupId: group.id }),
    ExpenseSource.destroy({ groupId: group.id }),
    GroupInvite.destroy({ groupId: group.id }),
  ]);

  await Group.destroyOne({ id: group.id });

  return res.json({ message: 'Grupo excluído.' });
};
