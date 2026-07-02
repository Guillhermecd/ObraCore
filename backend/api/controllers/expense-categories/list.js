module.exports = async function list(req, res) {
  const categories = await ExpenseCategory.find({ owner: req.user.id }).sort('name ASC');

  return res.json({ categories });
};
