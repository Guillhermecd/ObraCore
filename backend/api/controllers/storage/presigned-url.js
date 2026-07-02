module.exports = async function presignedUrl(req, res) {
  const { key } = req.query;

  if (!key) {
    return res.badRequest({ message: 'Key obrigatória.' });
  }

  const url = await sails.services.storageservice.getPresignedUrl(key);
  return res.json({ url });
};
