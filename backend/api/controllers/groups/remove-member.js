module.exports = async function removeMember(req, res) {
  const group = await Group.findOne({ id: req.params.id });

  if (!group || !sails.services.groupservice.isMember(req.userRecord, group.id)) {
    return res.status(404).json({ message: 'Grupo não encontrado.' });
  }

  const { userId } = req.params;

  const permission = sails.services.groupservice.assertCanActOnMember(group, req.user.id, userId);
  if (permission.error) {
    return res.status(403).json({ message: permission.error });
  }

  const member = await User.findOne({ id: userId });

  if (!member) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  await sails.services.groupservice.removeMember(group, member);

  return res.json({ message: 'Colaborador removido.' });
};
