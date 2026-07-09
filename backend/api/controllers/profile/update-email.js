module.exports = async function updateEmail(req, res) {
  const { email, emailConfirmation } = req.body;

  if (!email || !emailConfirmation) {
    return res.badRequest({ message: 'E-mail e confirmação são obrigatórios.' });
  }

  const normalizedEmail = sails.services.authservice.normalizeEmail(email);

  if (normalizedEmail !== sails.services.authservice.normalizeEmail(emailConfirmation)) {
    return res.badRequest({ message: 'A confirmação de e-mail não confere.' });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser && existingUser.id !== req.user.id) {
    return res.status(409).json({ message: 'Já existe um usuário com este e-mail.' });
  }

  const verification = sails.services.authservice.createEmailVerification();
  const user = await User.updateOne({ id: req.user.id }).set({
    email: normalizedEmail,
    emailValidated: false,
    ...verification,
  });

  await sails.services.emailservice.sendVerificationEmail(user);

  return res.json({
    message: 'E-mail atualizado. Verifique a nova caixa de entrada para validar o endereço.',
    user: sails.services.authservice.sanitizeUser(user),
  });
};
