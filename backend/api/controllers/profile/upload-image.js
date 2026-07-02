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

module.exports = async function uploadImage(req, res) {
  const file = await uploadFile(req);

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
