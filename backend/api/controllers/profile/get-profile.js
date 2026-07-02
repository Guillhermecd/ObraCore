module.exports = async function getProfile(req, res) {
  return res.json({ user: req.user });
};
