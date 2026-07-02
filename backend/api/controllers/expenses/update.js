module.exports = async function update(req, res) {
  const expense = await Expense.findOne({ id: req.params.id, owner: req.user.id });

  if (!expense) {
    return res.status(404).json({ message: 'Lançamento não encontrado.' });
  }

  const { date, categoryId, sourceId, supplier, paymentMethod, amount, notes } = req.body;
  const valuesToSet = {};

  if (date !== undefined) {
    valuesToSet.date = date;
  }

  if (categoryId !== undefined) {
    const category = await ExpenseCategory.findOne({ id: categoryId, owner: req.user.id });
    if (!category) {
      return res.badRequest({ message: 'Categoria inválida.' });
    }
    valuesToSet.categoryId = categoryId;
  }

  if (sourceId !== undefined) {
    const source = await ExpenseSource.findOne({ id: sourceId, owner: req.user.id });
    if (!source) {
      return res.badRequest({ message: 'Fonte inválida.' });
    }
    valuesToSet.sourceId = sourceId;
  }

  if (supplier !== undefined) {
    valuesToSet.supplier = supplier ? supplier.trim() : null;
  }

  if (paymentMethod !== undefined) {
    if (!sails.services.expenseservice.isValidPaymentMethod(paymentMethod)) {
      return res.badRequest({ message: 'Forma de pagamento inválida.' });
    }
    valuesToSet.paymentMethod = paymentMethod;
  }

  if (amount !== undefined) {
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return res.badRequest({ message: 'Valor deve ser um número maior que zero.' });
    }
    valuesToSet.amount = numericAmount;
  }

  if (notes !== undefined) {
    valuesToSet.notes = notes ? notes.trim() : null;
  }

  const updatedExpense = await Expense.updateOne({ id: expense.id }).set(valuesToSet);

  return res.json({ expense: updatedExpense });
};
