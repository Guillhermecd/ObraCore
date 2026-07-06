module.exports = async function listSent(req, res) {
  const invites = await GroupInvite.find({ inviterId: req.user.id, status: 'pending' }).sort('createdAt DESC');

  const groups = await Group.find({ id: { in: invites.map((invite) => invite.groupId) } });
  const groupById = new Map(groups.map((group) => [group.id, group]));

  return res.json({
    invites: invites.map((invite) => ({
      id: invite.id,
      groupId: invite.groupId,
      groupName: groupById.get(invite.groupId)?.name || 'Grupo removido',
      inviteeEmail: invite.inviteeEmail,
      status: invite.status,
      createdAt: invite.createdAt,
    })),
  });
};
