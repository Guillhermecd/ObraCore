module.exports = async function removeMember(req, res) {
  const group = await Group.findOne({ id: req.params.id });

  if (!group || !sails.services.groupservice.isMember(req.userRecord, group.id)) {
    return res.status(404).json({ message: 'Grupo não encontrado.' });
  }

  if (group.owner !== req.user.id) {
    return res.status(403).json({ message: 'Apenas o criador do grupo pode remover colaboradores.' });
  }

  const { userId } = req.params;

  if (userId === group.owner) {
    return res.badRequest({ message: 'O criador do grupo não pode ser removido.' });
  }

  const member = await User.findOne({ id: userId });

  if (!member) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  await sails.services.groupservice.removeMember(group, member);

  return res.json({ message: 'Colaborador removido.' });
};
