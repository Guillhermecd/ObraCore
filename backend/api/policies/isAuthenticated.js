module.exports = async function isAuthenticated(req, res, proceed) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Autenticação obrigatória.' });
  }

  try {
    const payload = await sails.services.authservice.verifyToken(token);
    const user = await User.findOne({ id: payload.sub });

    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }

    req.user = sails.services.authservice.sanitizeUser(user);
    req.userRecord = user;
    return proceed();
  } catch (error) {
    sails.log.debug(error);
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
};
