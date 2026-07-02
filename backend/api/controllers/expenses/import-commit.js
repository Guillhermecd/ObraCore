const fs = require('fs');

function uploadFile(req) {
  return new Promise((resolve, reject) => {
    req.file('file').upload({ maxBytes: 5 * 1024 * 1024 }, (error, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(files[0]);
    });
  });
}

module.exports = async function importCommit(req, res) {
  const file = await uploadFile(req);

  if (!file) {
    return res.badRequest({ message: 'Arquivo obrigatório.' });
  }

  try {
    const buffer = await fs.promises.readFile(file.fd);
    const parsed = await sails.services.expenseimportservice.parseFile(buffer, file.filename);

    const validRows = parsed.rows.filter((row) => row.valid);
    const failed = parsed.rows
      .filter((row) => !row.valid)
      .map((row) => ({ rowNumber: row.rowNumber, message: row.errors.join(' ') }));

    if (validRows.length === 0) {
      return res.status(201).json({ imported: 0, failed });
    }

    const [categories, sources] = await Promise.all([
      ExpenseCategory.find({ owner: req.user.id }),
      ExpenseSource.find({ owner: req.user.id }),
    ]);

    const categoryByName = new Map(
      categories.map((category) => [category.name.trim().toLowerCase(), category]),
    );
    const sourceByName = new Map(sources.map((source) => [source.name.trim().toLowerCase(), source]));

    // Nomes distintos ausentes dentro deste arquivo (deduplicados aqui para não
    // criar a mesma categoria/fonte nova mais de uma vez no mesmo import).
    // Observação: como não há índice único (owner, name) no model, uma corrida
    // entre requisições concorrentes ainda poderia criar duplicatas — aceito
    // como limitação conhecida, mitigada no frontend ao desabilitar o botão
    // de confirmação durante a chamada.
    const missingCategoryNames = new Map();
    const missingSourceNames = new Map();
    validRows.forEach((row) => {
      const categoryKey = row.categoryName.toLowerCase();
      if (!categoryByName.has(categoryKey) && !missingCategoryNames.has(categoryKey)) {
        missingCategoryNames.set(categoryKey, row.categoryName);
      }
      const sourceKey = row.sourceName.toLowerCase();
      if (!sourceByName.has(sourceKey) && !missingSourceNames.has(sourceKey)) {
        missingSourceNames.set(sourceKey, row.sourceName);
      }
    });

    const createdCategories = await Promise.all(
      Array.from(missingCategoryNames.values()).map((name) =>
        ExpenseCategory.create({ name, owner: req.user.id }).fetch(),
      ),
    );
    createdCategories.forEach((category) => {
      categoryByName.set(category.name.trim().toLowerCase(), category);
    });

    const createdSources = await Promise.all(
      Array.from(missingSourceNames.values()).map((name) =>
        ExpenseSource.create({ name, owner: req.user.id }).fetch(),
      ),
    );
    createdSources.forEach((source) => {
      sourceByName.set(source.name.trim().toLowerCase(), source);
    });

    const expensesToCreate = validRows.map((row) => ({
      date: row.date,
      categoryId: categoryByName.get(row.categoryName.toLowerCase()).id,
      sourceId: sourceByName.get(row.sourceName.toLowerCase()).id,
      supplier: row.supplier,
      paymentMethod: row.paymentMethod,
      amount: row.amount,
      notes: row.notes,
      owner: req.user.id,
    }));

    // Expense.createEach() aciona o lifecycle hook beforeCreate com uma
    // assinatura diferente de .create() nesta versão do Waterline (o
    // callback "proceed" não é passado), causando erro em tempo de
    // execução. .create() em paralelo usa o mesmo caminho já validado
    // pelo endpoint de criação individual.
    await Promise.all(expensesToCreate.map((values) => Expense.create(values)));

    return res.status(201).json({ imported: expensesToCreate.length, failed });
  } catch (error) {
    if (error.isImportError) {
      return res.badRequest({ message: error.message });
    }
    throw error;
  } finally {
    fs.unlink(file.fd, () => undefined);
  }
};
