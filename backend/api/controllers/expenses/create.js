module.exports = async function create(req, res) {
  const { date, categoryId, sourceId, supplier, paymentMethod, amount, notes } = req.body;

  if (!date || !categoryId || !sourceId || !paymentMethod || amount === undefined || amount === null) {
    return res.badRequest({
      message: 'Data, categoria, fonte, forma de pagamento e valor são obrigatórios.',
    });
  }

  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return res.badRequest({ message: 'Valor deve ser um número maior que zero.' });
  }

  if (!sails.services.expenseservice.isValidPaymentMethod(paymentMethod)) {
    return res.badRequest({ message: 'Forma de pagamento inválida.' });
  }

  const groupId = await sails.services.groupservice.resolveGroupId(req);

  const category = await ExpenseCategory.findOne({ id: categoryId, groupId });
  if (!category) {
    return res.badRequest({ message: 'Categoria inválida.' });
  }

  const source = await ExpenseSource.findOne({ id: sourceId, groupId });
  if (!source) {
    return res.badRequest({ message: 'Fonte inválida.' });
  }

  const expense = await Expense.create({
    date,
    categoryId,
    sourceId,
    supplier: supplier ? supplier.trim() : null,
    paymentMethod,
    amount: numericAmount,
    notes: notes ? notes.trim() : null,
    owner: req.user.id,
    groupId,
  }).fetch();

  return res.status(201).json({ expense });
};
