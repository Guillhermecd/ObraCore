module.exports = async function remove(req, res) {
  const category = await ExpenseCategory.findOne({ id: req.params.id, owner: req.user.id });

  if (!category) {
    return res.status(404).json({ message: 'Categoria não encontrada.' });
  }

  const expensesUsingCategory = await Expense.count({
    owner: req.user.id,
    categoryId: category.id,
  });

  if (expensesUsingCategory > 0) {
    return res.status(409).json({ message: 'Categoria em uso por lançamentos e não pode ser excluída.' });
  }

  await ExpenseCategory.destroyOne({ id: category.id });

  return res.json({ message: 'Categoria excluída.' });
};
