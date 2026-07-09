function compareCreatedAt(a, b) {
  if (a.createdAt < b.createdAt) {
    return -1;
  }
  if (a.createdAt > b.createdAt) {
    return 1;
  }
  return 0;
}

module.exports = async function list(req, res) {
  const memberships = await GroupMember.find({ user: req.user.id }).populate('group');
  const groups = memberships
    .map((membership) => membership.group)
    .filter(Boolean)
    .sort(compareCreatedAt);

  const groupIds = groups.map((group) => group.id);
  const groupMemberships = groupIds.length > 0 ? await GroupMember.find({ group: { in: groupIds } }) : [];
  const memberCounts = new Map();
  groupMemberships.forEach((membership) => {
    memberCounts.set(membership.group, (memberCounts.get(membership.group) || 0) + 1);
  });

  const activeGroupId = await sails.services.groupservice.resolveGroupId(req);

  return res.json({
    groups: groups.map((group) =>
      sails.services.groupservice.serializeGroup(group, req.user.id, memberCounts.get(group.id) || 0),
    ),
    activeGroupId,
  });
};
