const dayjs = require('dayjs');

module.exports = async function verifyEmail(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.badRequest({ message: 'Token de validação obrigatório.' });
  }

  const user = await User.findOne({ emailVerificationToken: token });

  if (!user || !user.emailVerificationExpiresAt || dayjs().isAfter(dayjs(user.emailVerificationExpiresAt))) {
    return res.status(400).json({ message: 'Token de validação inválido ou expirado.' });
  }

  const updatedUser = await User.updateOne({ id: user.id }).set({
    emailValidated: true,
    emailVerificationToken: null,
    emailVerificationExpiresAt: null,
  });

  return res.json({
    message: 'E-mail validado com sucesso.',
    user: sails.services.authservice.sanitizeUser(updatedUser),
  });
};
