module.exports = async function resendVerification(req, res) {
  const requestedEmail = req.body.email || (req.user && req.user.email);

  if (!requestedEmail) {
    return res.badRequest({ message: 'E-mail obrigatório.' });
  }

  const user = await User.findOne({ email: requestedEmail.toLowerCase().trim() });

  if (!user || user.emailValidated) {
    return res.json({ message: 'Se o e-mail precisar de validação, enviaremos uma nova mensagem.' });
  }

  await sails.services.authservice.sendVerificationEmail(user);
  return res.json({ message: 'Se o e-mail precisar de validação, enviaremos uma nova mensagem.' });
};
