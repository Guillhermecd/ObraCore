module.exports = async function listReceived(req, res) {
  const invites = await GroupInvite.find({ inviteeId: req.user.id, status: 'pending' }).sort('createdAt DESC');

  const groups = await Group.find({ id: { in: invites.map((invite) => invite.groupId) } });
  const groupById = new Map(groups.map((group) => [group.id, group]));

  const inviterIds = Array.from(new Set(invites.map((invite) => invite.inviterId)));
  const inviters = await User.find({ id: { in: inviterIds } });
  const inviterById = new Map(inviters.map((inviter) => [inviter.id, inviter]));

  return res.json({
    invites: invites.map((invite) => {
      const inviter = inviterById.get(invite.inviterId);
      return {
        id: invite.id,
        groupId: invite.groupId,
        groupName: groupById.get(invite.groupId)?.name || 'Grupo removido',
        inviterName: (inviter && (inviter.name || inviter.email)) || 'Usuário',
        role: invite.role || 'FISCAL',
        status: invite.status,
        createdAt: invite.createdAt,
      };
    }),
  });
};
