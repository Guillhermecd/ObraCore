const FORECAST_WINDOW_DAYS = 30;

function toDateKey(dateLike) {
  return new Date(dateLike).toISOString().slice(0, 10);
}

module.exports = async function cashflowForecast(req, res) {
  const groupIds = Array.isArray(req.userRecord.groupIds) ? req.userRecord.groupIds : [];

  if (groupIds.length === 0) {
    return res.json({ entradasPrevistas: 0, saidasPrevistas: 0, resultadoPrevisto: 0, serie: [] });
  }

  const expenses = await Expense.find({ groupId: { in: groupIds } });

  const today = sails.services.dashboardservice.startOfTodayUTC();
  const windowEnd = new Date(today.getTime() + FORECAST_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Previsto = ainda não realizado e com data prevista dentro dos próximos 30 dias.
  const forecastExpenses = expenses.filter((expense) => {
    if (sails.services.dashboardservice.isRealizada(expense)) {
      return false;
    }
    const previstaRaw = sails.services.dashboardservice.forecastDate(expense);
    if (!previstaRaw) {
      return false;
    }
    const previstaAt = new Date(previstaRaw);
    return previstaAt >= today && previstaAt <= windowEnd;
  });

  let entradasPrevistas = 0;
  let saidasPrevistas = 0;
  const buckets = new Map(); // `${dateKey}|${tipo}` -> valor

  forecastExpenses.forEach((expense) => {
    const dateKey = toDateKey(sails.services.dashboardservice.forecastDate(expense));
    const tipoLabel = expense.tipo === 'ENTRADA' ? 'Entrada' : 'Saída';
    const bucketKey = `${dateKey}|${tipoLabel}`;
    buckets.set(bucketKey, (buckets.get(bucketKey) || 0) + expense.amount);

    if (expense.tipo === 'ENTRADA') {
      entradasPrevistas += expense.amount;
    } else {
      saidasPrevistas += expense.amount;
    }
  });

  const serie = Array.from(buckets.entries())
    .map(([bucketKey, valor]) => {
      const [data, tipo] = bucketKey.split('|');
      return { data, tipo, valor };
    })
    .sort((a, b) => (a.data === b.data ? a.tipo.localeCompare(b.tipo) : a.data.localeCompare(b.data)));

  return res.json({
    entradasPrevistas,
    saidasPrevistas,
    // Resultado do PERÍODO, não saldo: o caixa projetado ao fim da janela é
    // este resultado somado ao saldo atual, e quem compõe isso é a tela.
    resultadoPrevisto: entradasPrevistas - saidasPrevistas,
    serie,
  });
};
