module.exports = async function list(req, res) {
  const groupId = await sails.services.groupservice.resolveGroupId(req);
  const expenses = await Expense.find({ groupId }).sort('date DESC');

  const expensesWithFreshUrls = await Promise.all(
    expenses.map(async (expense) => {
      if (!expense.comprovante?.key) {
        return expense;
      }

      return {
        ...expense,
        comprovante: {
          ...expense.comprovante,
          url: await sails.services.storageservice.getPresignedUrl(expense.comprovante.key),
        },
      };
    }),
  );

  return res.json({ expenses: expensesWithFreshUrls });
};
