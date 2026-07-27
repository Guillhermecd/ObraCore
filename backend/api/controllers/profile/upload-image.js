const fs = require('fs');

module.exports = async function uploadImage(req, res) {
  const file = await sails.services.storageservice.receiveUploadedFile(req);

  if (!file) {
    return res.badRequest({ message: 'Arquivo obrigatório.' });
  }

  try {
    const uploadedFile = await sails.services.storageservice.uploadLocalFile({
      filePath: file.fd,
      filename: file.filename,
      contentType: file.type,
      keyPrefix: `users/${req.user.id}/profile-image`,
    });

    const user = await User.updateOne({ id: req.user.id }).set({
      profileImage: uploadedFile,
    });

    return res.json({ user: sails.services.authservice.sanitizeUser(user) });
  } finally {
    fs.unlink(file.fd, () => undefined);
  }
};
