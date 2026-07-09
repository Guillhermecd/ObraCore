module.exports = async function members(req, res) {
  const group = await Group.findOne({ id: req.params.id });

  if (!group || !(await sails.services.groupservice.isMember(req.userRecord, group.id))) {
    return res.status(404).json({ message: 'Grupo não encontrado.' });
  }

  const memberships = await GroupMember.find({ group: group.id }).populate('user');

  return res.json({
    members: memberships
      .filter((membership) => membership.user)
      .map((membership) => ({
        ...sails.services.authservice.sanitizeUser(membership.user),
        isOwner: membership.user.id === group.owner,
      })),
  });
};
