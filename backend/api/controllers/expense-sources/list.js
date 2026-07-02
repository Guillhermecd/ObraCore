module.exports = async function list(req, res) {
  const sources = await ExpenseSource.find({ owner: req.user.id }).sort('name ASC');

  return res.json({ sources });
};
