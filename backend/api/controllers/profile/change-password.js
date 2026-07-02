module.exports = async function changePassword(req, res) {
  const { currentPassword, password, passwordConfirmation } = req.body;

  if (!currentPassword || !password || !passwordConfirmation) {
    return res.badRequest({ message: 'Senha atual, nova senha e confirmação são obrigatórias.' });
  }

  if (password !== passwordConfirmation) {
    return res.badRequest({ message: 'A confirmação de senha não confere.' });
  }

  const user = await User.findOne({ id: req.user.id });

  if (!(await sails.services.authservice.comparePassword(currentPassword, user))) {
    return res.status(400).json({ message: 'Senha atual inválida.' });
  }

  await User.updateOne({ id: req.user.id }).set({ password });

  return res.json({ message: 'Senha alterada com sucesso.' });
};
