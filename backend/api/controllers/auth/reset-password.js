const dayjs = require('dayjs');

module.exports = async function resetPassword(req, res) {
  const { token, password, passwordConfirmation } = req.body;

  if (!token || !password || !passwordConfirmation) {
    return res.badRequest({ message: 'Token, nova senha e confirmação são obrigatórios.' });
  }

  if (password !== passwordConfirmation) {
    return res.badRequest({ message: 'A confirmação de senha não confere.' });
  }

  const user = await User.findOne({ passwordResetToken: token });

  if (!user || !user.passwordResetExpiresAt || dayjs().isAfter(dayjs(user.passwordResetExpiresAt))) {
    return res.status(400).json({ message: 'Token de redefinição inválido ou expirado.' });
  }

  await User.updateOne({ id: user.id }).set({
    password,
    passwordResetToken: null,
    passwordResetExpiresAt: null,
  });

  return res.json({ message: 'Senha redefinida com sucesso.' });
};
