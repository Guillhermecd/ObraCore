module.exports = async function health(req, res) {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
};
