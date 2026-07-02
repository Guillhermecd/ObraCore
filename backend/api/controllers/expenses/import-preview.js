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

module.exports = async function importPreview(req, res) {
  const file = await uploadFile(req);

  if (!file) {
    return res.badRequest({ message: 'Arquivo obrigatório.' });
  }

  try {
    const buffer = await fs.promises.readFile(file.fd);
    const parsed = await sails.services.expenseimportservice.parseFile(buffer, file.filename);

    const [categories, sources] = await Promise.all([
      ExpenseCategory.find({ owner: req.user.id }),
      ExpenseSource.find({ owner: req.user.id }),
    ]);

    const categoryNames = new Set(categories.map((category) => category.name.trim().toLowerCase()));
    const sourceNames = new Set(sources.map((source) => source.name.trim().toLowerCase()));

    const rows = parsed.rows.map((row) => ({
      ...row,
      categoryIsNew: row.categoryName ? !categoryNames.has(row.categoryName.toLowerCase()) : false,
      sourceIsNew: row.sourceName ? !sourceNames.has(row.sourceName.toLowerCase()) : false,
    }));

    return res.json({ rows, summary: parsed.summary });
  } catch (error) {
    if (error.isImportError) {
      return res.badRequest({ message: error.message });
    }
    throw error;
  } finally {
    fs.unlink(file.fd, () => undefined);
  }
};
