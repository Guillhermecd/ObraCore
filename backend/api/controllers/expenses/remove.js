module.exports = async function remove(req, res) {
  const groupId = await sails.services.groupservice.resolveGroupId(req);

  if (!(await sails.services.groupservice.requireWrite(req, res, groupId))) {
    return;
  }

  const expense = await Expense.findOne({ id: req.params.id, groupId });

  if (!expense) {
    return res.status(404).json({ message: 'Lançamento não encontrado.' });
  }

  await Expense.destroyOne({ id: expense.id });

  return res.json({ message: 'Lançamento excluído.' });
};
