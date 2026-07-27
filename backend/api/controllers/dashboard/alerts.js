module.exports = async function alerts(req, res) {
  const groupIds = sails.services.groupservice.toArray(req.userRecord.groupIds);

  if (groupIds.length === 0) {
    return res.json([]);
  }

  const [groups, expenses] = await Promise.all([
    Group.find({ id: { in: groupIds } }),
    Expense.find({ groupId: { in: groupIds } }),
  ]);

  return res.json(sails.services.dashboardservice.buildAlerts(groups, expenses));
};
