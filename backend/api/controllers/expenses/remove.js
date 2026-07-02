module.exports = async function remove(req, res) {
  const expense = await Expense.findOne({ id: req.params.id, owner: req.user.id });

  if (!expense) {
    return res.status(404).json({ message: 'Lançamento não encontrado.' });
  }

  await Expense.destroyOne({ id: expense.id });

  return res.json({ message: 'Lançamento excluído.' });
};
