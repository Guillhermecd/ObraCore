module.exports = async function list(req, res) {
  const groupId = await sails.services.groupservice.resolveGroupId(req);
  const sources = await ExpenseSource.find({ groupId }).sort('name ASC');

  return res.json({ sources });
};
