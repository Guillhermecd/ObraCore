const fs = require('fs');

const ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

module.exports = async function uploadComprovante(req, res) {
  const groupId = await sails.services.groupservice.resolveGroupId(req);

  if (!(await sails.services.groupservice.requireWrite(req, res, groupId))) {
    return;
  }

  const expense = await Expense.findOne({ id: req.params.id, groupId });

  if (!expense) {
    return res.status(404).json({ message: 'Lançamento não encontrado.' });
  }

  const file = await sails.services.storageservice.receiveUploadedFile(req);

  if (!file) {
    return res.badRequest({ message: 'Arquivo obrigatório.' });
  }

  try {
    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      return res.badRequest({ message: 'Formato de arquivo inválido. Envie um PDF, JPG ou PNG.' });
    }

    const uploadedFile = await sails.services.storageservice.uploadLocalFile({
      filePath: file.fd,
      filename: file.filename,
      contentType: file.type,
      keyPrefix: `groups/${groupId}/expenses/${expense.id}/comprovante`,
    });

    const updatedExpense = await Expense.updateOne({ id: expense.id }).set({
      comprovante: uploadedFile,
    });

    return res.json({ expense: updatedExpense });
  } finally {
    fs.unlink(file.fd, () => undefined);
  }
};
