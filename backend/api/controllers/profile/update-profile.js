module.exports = async function updateProfile(req, res) {
  const { name } = req.body;

  const user = await User.updateOne({ id: req.user.id }).set({
    name: name ? name.trim() : null,
  });

  return res.json({ user: sails.services.authservice.sanitizeUser(user) });
};
