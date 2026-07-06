const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

function nowIso() {
  return new Date().toISOString();
}

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

async function hashPasswordIfNeeded(valuesToSet) {
  if (valuesToSet.password && !isBcryptHash(valuesToSet.password)) {
    valuesToSet.password = await bcrypt.hash(valuesToSet.password, SALT_ROUNDS);
  }
}

module.exports = {
  tableName: 'users',

  attributes: {
    email: { type: 'string', required: true, unique: true, isEmail: true },
    emailValidated: { type: 'boolean', defaultsTo: false },
    password: { type: 'string', required: true },
    name: { type: 'string', allowNull: true },
    profileImage: { type: 'json' },
    emailVerificationToken: { type: 'string', allowNull: true },
    emailVerificationExpiresAt: { type: 'string', allowNull: true },
    passwordResetToken: { type: 'string', allowNull: true },
    passwordResetExpiresAt: { type: 'string', allowNull: true },
    groupIds: { type: 'json', defaultsTo: [] },
  },

  customToJSON() {
    return sails.services.authservice.sanitizeUser(this);
  },

  beforeCreate: async function beforeCreate(valuesToSet, proceed) {
    try {
      const timestamp = nowIso();
      valuesToSet.createdAt = timestamp;
      valuesToSet.updatedAt = timestamp;
      valuesToSet.email = valuesToSet.email.toLowerCase().trim();
      await hashPasswordIfNeeded(valuesToSet);
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },

  beforeUpdate: async function beforeUpdate(valuesToSet, proceed) {
    try {
      valuesToSet.updatedAt = nowIso();
      if (valuesToSet.email) {
        valuesToSet.email = valuesToSet.email.toLowerCase().trim();
      }
      await hashPasswordIfNeeded(valuesToSet);
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },
};
