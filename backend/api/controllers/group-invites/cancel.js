module.exports = async function cancel(req, res) {
  const invite = await GroupInvite.findOne({ id: req.params.id, inviterId: req.user.id, status: 'pending' });

  if (!invite) {
    return res.status(404).json({ message: 'Convite não encontrado.' });
  }

  await GroupInvite.updateOne({ id: invite.id }).set({ status: 'cancelled' });

  return res.json({ message: 'Convite cancelado.' });
};
