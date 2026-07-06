module.exports = async function decline(req, res) {
  const invite = await GroupInvite.findOne({ id: req.params.id, inviteeId: req.user.id, status: 'pending' });

  if (!invite) {
    return res.status(404).json({ message: 'Convite não encontrado.' });
  }

  await GroupInvite.updateOne({ id: invite.id }).set({ status: 'declined' });

  return res.json({ message: 'Convite recusado.' });
};
