function effectiveDate(expense) {
  return expense.dataRealizada || expense.dataPrevista || expense.date;
}

module.exports = async function movimentacoes(req, res) {
  const groupIds = Array.isArray(req.userRecord.groupIds) ? req.userRecord.groupIds : [];
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  if (groupIds.length === 0) {
    return res.json({ items: [], page, limit, total: 0 });
  }

  const [expenses, groups, categories] = await Promise.all([
    Expense.find({ groupId: { in: groupIds } }),
    Group.find({ id: { in: groupIds } }),
    ExpenseCategory.find({ groupId: { in: groupIds } }),
  ]);

  const groupNameById = new Map(groups.map((group) => [group.id, group.name]));
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  const items = expenses
    .map((expense) => ({
      id: expense.id,
      data: effectiveDate(expense),
      groupId: expense.groupId,
      projeto: groupNameById.get(expense.groupId) || null,
      tipo: expense.tipo || 'SAIDA',
      categoria: categoryNameById.get(expense.categoryId) || null,
      valor: expense.amount,
      status: sails.services.dashboardservice.deriveStatus(expense),
    }))
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  const total = items.length;
  const start = (page - 1) * limit;
  const pageItems = items.slice(start, start + limit);

  return res.json({ items: pageItems, page, limit, total });
};
