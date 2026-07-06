module.exports = async function members(req, res) {
  const group = await Group.findOne({ id: req.params.id });

  if (!group || !sails.services.groupservice.isMember(req.userRecord, group.id)) {
    return res.status(404).json({ message: 'Grupo não encontrado.' });
  }

  const memberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
  const members = await User.find({ id: { in: memberIds } });

  return res.json({
    members: members.map((member) => ({
      ...sails.services.authservice.sanitizeUser(member),
      isOwner: member.id === group.owner,
    })),
  });
};
