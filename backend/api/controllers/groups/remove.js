module.exports = async function remove(req, res) {
  const group = await Group.findOne({ id: req.params.id });

  if (!group || !(await sails.services.groupservice.isMember(req.userRecord, group.id))) {
    return res.status(404).json({ message: 'Grupo não encontrado.' });
  }

  if (group.owner !== req.user.id) {
    return res.status(403).json({ message: 'Apenas o criador do grupo pode excluí-lo.' });
  }

  if (group.isPersonal) {
    return res.badRequest({ message: 'O grupo Pessoal não pode ser excluído.' });
  }

  await Promise.all([
    GroupMember.destroy({ group: group.id }),
    Expense.destroy({ groupId: group.id }),
    ExpenseCategory.destroy({ groupId: group.id }),
    ExpenseSource.destroy({ groupId: group.id }),
    GroupInvite.destroy({ groupId: group.id }),
  ]);

  await Group.destroyOne({ id: group.id });

  return res.json({ message: 'Grupo excluído.' });
};
