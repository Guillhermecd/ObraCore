function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

module.exports = {
  /**
   * Status é sempre derivado das datas do lançamento, nunca armazenado.
   */
  deriveStatus(expense) {
    if (expense.dataRealizada) {
      return 'REALIZADO';
    }

    const previstaRaw = expense.dataPrevista || expense.date;
    if (previstaRaw && new Date(previstaRaw) < startOfTodayUTC()) {
      return 'ATRASADO';
    }

    return 'PENDENTE';
  },
};
