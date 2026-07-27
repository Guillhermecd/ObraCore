module.exports = async function accept(req, res) {
  const invite = await GroupInvite.findOne({ id: req.params.id, inviteeId: req.user.id, status: 'pending' });

  if (!invite) {
    return res.status(404).json({ message: 'Convite não encontrado.' });
  }

  const group = await Group.findOne({ id: invite.groupId });

  if (!group) {
    await GroupInvite.updateOne({ id: invite.id }).set({ status: 'cancelled' });
    return res.status(404).json({ message: 'Grupo não encontrado.' });
  }

  // Convites pendentes criados antes do campo `role` não o têm — FISCAL é o
  // padrão seguro para eles.
  await sails.services.groupservice.addMember(group, req.userRecord, invite.role || 'FISCAL');
  await GroupInvite.updateOne({ id: invite.id }).set({ status: 'accepted' });

  return res.json({ message: 'Convite aceito.' });
};
