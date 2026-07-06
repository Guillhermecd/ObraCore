module.exports = async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.badRequest({ message: 'E-mail e senha são obrigatórios.' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user || !(await sails.services.authservice.comparePassword(password, user))) {
    return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
  }

  await sails.services.groupservice.ensurePersonalGroup(user);

  return res.json({
    token: sails.services.authservice.signToken(user),
    user: sails.services.authservice.sanitizeUser(user),
  });
};
