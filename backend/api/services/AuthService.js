const crypto = require('crypto');
const bcrypt = require('bcrypt');
const dayjs = require('dayjs');
const jwt = require('jsonwebtoken');

const PASSWORD_RESET_MESSAGE =
  'Se o e-mail informado existir, enviaremos um link para redefinição de senha.';

function token() {
  return crypto.randomBytes(32).toString('hex');
}

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não configurado.');
  }
  return secret;
}

module.exports = {
  passwordResetMessage: PASSWORD_RESET_MESSAGE,

  normalizeEmail(email) {
    return email.toLowerCase().trim();
  },

  sanitizeUser(user) {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      emailValidated: user.emailValidated,
      name: user.name || null,
      profileImage: user.profileImage || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },

  signToken(user) {
    return jwt.sign({ sub: user.id, email: user.email }, jwtSecret(), {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  },

  verifyToken(authToken) {
    return jwt.verify(authToken, jwtSecret());
  },

  async comparePassword(plainTextPassword, user) {
    return bcrypt.compare(plainTextPassword, user.password);
  },

  createEmailVerification() {
    const hours = Number(process.env.EMAIL_VERIFICATION_EXPIRES_IN_HOURS || 24);
    return {
      emailVerificationToken: token(),
      emailVerificationExpiresAt: dayjs().add(hours, 'hour').toISOString(),
    };
  },

  createPasswordReset() {
    const minutes = Number(process.env.PASSWORD_RESET_EXPIRES_IN_MINUTES || 30);
    return {
      passwordResetToken: token(),
      passwordResetExpiresAt: dayjs().add(minutes, 'minute').toISOString(),
    };
  },

  async ensureInitialUser() {
    const email = process.env.INITIAL_USER_EMAIL;
    const password = process.env.INITIAL_USER_PASSWORD;

    if (!email || !password) {
      sails.log.warn('INITIAL_USER_EMAIL ou INITIAL_USER_PASSWORD não configurado.');
      return;
    }

    const normalizedEmail = this.normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return;
    }

    const verification = this.createEmailVerification();

    const user = await User.create({
      email: normalizedEmail,
      password,
      name: process.env.INITIAL_USER_NAME || 'Administrador',
      emailValidated: true,
      ...verification,
    }).fetch();

    await sails.services.groupservice.ensurePersonalGroup(user);

    sails.log.info(`Usuário inicial criado: ${normalizedEmail}`);
  },

  async sendVerificationEmail(user) {
    const verification = this.createEmailVerification();
    const updatedUser = await User.updateOne({ id: user.id }).set(verification);
    await sails.services.emailservice.sendVerificationEmail(updatedUser);
    return updatedUser;
  },
};
