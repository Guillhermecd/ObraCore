module.exports = async function list(req, res) {
  const groupIds = Array.isArray(req.userRecord.groupIds) ? req.userRecord.groupIds : [];
  const groups = await Group.find({ id: { in: groupIds } }).sort('createdAt ASC');
  const activeGroupId = await sails.services.groupservice.resolveGroupId(req);

  return res.json({
    groups: groups.map((group) => sails.services.groupservice.serializeGroup(group, req.user.id)),
    activeGroupId,
  });
};
