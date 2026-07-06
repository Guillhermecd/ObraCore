module.exports = async function list(req, res) {
  const groupId = await sails.services.groupservice.resolveGroupId(req);
  const categories = await ExpenseCategory.find({ groupId }).sort('name ASC');

  return res.json({ categories });
};
