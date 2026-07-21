module.exports = async function overview(req, res) {
  const groupIds = Array.isArray(req.userRecord.groupIds) ? req.userRecord.groupIds : [];

  if (groupIds.length === 0) {
    return res.json({ totais: { entradas: 0, saidas: 0, saldo: 0 }, projetos: [] });
  }

  const [groups, expenses] = await Promise.all([
    Group.find({ id: { in: groupIds } }),
    Expense.find({ groupId: { in: groupIds } }),
  ]);

  const buckets = new Map(groupIds.map((id) => [id, { saldoAtual: 0, custoReal: 0 }]));
  let entradas = 0;
  let saidas = 0;

  expenses.forEach((expense) => {
    if (!expense.dataRealizada) {
      return;
    }

    const bucket = buckets.get(expense.groupId);
    if (!bucket) {
      return;
    }

    if (expense.tipo === 'ENTRADA') {
      entradas += expense.amount;
      bucket.saldoAtual += expense.amount;
    } else {
      saidas += expense.amount;
      bucket.saldoAtual -= expense.amount;
      bucket.custoReal += expense.amount;
    }
  });

  const projetos = groups.map((group) => {
    const bucket = buckets.get(group.id) || { saldoAtual: 0, custoReal: 0 };
    const gastoPlanejado = group.plannedSpending || null;
    const consumoPct = gastoPlanejado
      ? Math.round((bucket.custoReal / gastoPlanejado) * 10000) / 100
      : null;

    return {
      id: group.id,
      nome: group.name,
      saldoAtual: bucket.saldoAtual,
      gastoPlanejado,
      custoReal: bucket.custoReal,
      consumoPct,
      estouro: consumoPct !== null && consumoPct > 100,
    };
  });

  return res.json({
    totais: { entradas, saidas, saldo: entradas - saidas },
    projetos,
  });
};
