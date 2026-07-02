module.exports = async function list(req, res) {
  const expenses = await Expense.find({ owner: req.user.id }).sort('date DESC');

  return res.json({ expenses });
};
