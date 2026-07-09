module.exports = async function forgotPassword(req, res) {
  const { email } = req.body;
  const message = sails.services.authservice.passwordResetMessage;

  if (!email) {
    return res.json({ message });
  }

  const user = await User.findOne({ email: sails.services.authservice.normalizeEmail(email) });

  if (user) {
    const reset = sails.services.authservice.createPasswordReset();
    const updatedUser = await User.updateOne({ id: user.id }).set(reset);
    await sails.services.emailservice.sendPasswordResetEmail(updatedUser);
  }

  return res.json({ message });
};
