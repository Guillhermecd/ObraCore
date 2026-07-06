const ExcelJS = require('exceljs');
const dayjs = require('dayjs');

// Cabeçalhos em sincronia com o modelo de importação — veja
// backend/api/services/ExpenseImportService.js (HEADER_ALIASES) e
// frontend/src/pages/ControlePage/ImportExpensesModal.tsx (TEMPLATE_HEADERS).
const COLUMNS = [
  { header: 'Data', key: 'date', width: 14 },
  { header: 'Categoria', key: 'category', width: 22 },
  { header: 'Fonte', key: 'source', width: 22 },
  { header: 'Fornecedor', key: 'supplier', width: 26 },
  { header: 'Forma de pagamento', key: 'paymentMethod', width: 20 },
  { header: 'Valor', key: 'amount', width: 16 },
  { header: 'Observações', key: 'notes', width: 32 },
];

module.exports = async function exportExpenses(req, res) {
  const groupId = await sails.services.groupservice.resolveGroupId(req);

  const [expenses, categories, sources] = await Promise.all([
    Expense.find({ groupId }).sort('date DESC'),
    ExpenseCategory.find({ groupId }),
    ExpenseSource.find({ groupId }),
  ]);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Lançamentos');
  worksheet.columns = COLUMNS;
  worksheet.getRow(1).font = { bold: true };

  expenses.forEach((expense) => {
    worksheet.addRow({
      date: dayjs(expense.date).format('DD/MM/YYYY'),
      category: categoryById.get(expense.categoryId)?.name || '',
      source: sourceById.get(expense.sourceId)?.name || '',
      supplier: expense.supplier || '',
      paymentMethod: expense.paymentMethod,
      amount: expense.amount,
      notes: expense.notes || '',
    });
  });

  worksheet.getColumn('amount').numFmt = 'R$ #,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();

  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition', 'attachment; filename="lancamentos.xlsx"');
  return res.send(Buffer.from(buffer));
};
