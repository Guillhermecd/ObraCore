module.exports = async function register(req, res) {
  const { email, emailConfirmation, password, passwordConfirmation, name } = req.body;

  if (!email || !emailConfirmation || !password || !passwordConfirmation) {
    return res.badRequest({ message: 'E-mail, confirmação de e-mail, senha e confirmação são obrigatórios.' });
  }

  if (email.toLowerCase().trim() !== emailConfirmation.toLowerCase().trim()) {
    return res.badRequest({ message: 'A confirmação de e-mail não confere.' });
  }

  if (password !== passwordConfirmation) {
    return res.badRequest({ message: 'A confirmação de senha não confere.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    return res.status(409).json({ message: 'Já existe um usuário com este e-mail.' });
  }

  const verification = sails.services.authservice.createEmailVerification();
  const user = await User.create({
    email: normalizedEmail,
    password,
    name: name ? name.trim() : null,
    emailValidated: false,
    ...verification,
  }).fetch();

  await sails.services.groupservice.ensurePersonalGroup(user);
  await sails.services.emailservice.sendVerificationEmail(user);

  return res.status(201).json({
    message: 'Conta criada. Verifique seu e-mail para validar o acesso.',
    user: sails.services.authservice.sanitizeUser(user),
  });
};
