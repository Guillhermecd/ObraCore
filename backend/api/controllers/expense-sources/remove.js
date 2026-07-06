module.exports = async function remove(req, res) {
  const groupId = await sails.services.groupservice.resolveGroupId(req);
  const source = await ExpenseSource.findOne({ id: req.params.id, groupId });

  if (!source) {
    return res.status(404).json({ message: 'Fonte não encontrada.' });
  }

  const expensesUsingSource = await Expense.count({
    groupId,
    sourceId: source.id,
  });

  if (expensesUsingSource > 0) {
    return res.status(409).json({ message: 'Fonte em uso por lançamentos e não pode ser excluída.' });
  }

  await ExpenseSource.destroyOne({ id: source.id });

  return res.json({ message: 'Fonte excluída.' });
};
