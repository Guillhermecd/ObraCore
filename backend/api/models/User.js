const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

async function hashPasswordIfNeeded(valuesToSet) {
  if (valuesToSet.password) {
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
    memberships: { collection: 'groupmember', via: 'user' },
  },

  customToJSON() {
    return sails.services.authservice.sanitizeUser(this);
  },

  beforeCreate: async function beforeCreate(valuesToSet, proceed) {
    try {
      valuesToSet.email = sails.services.authservice.normalizeEmail(valuesToSet.email);
      await hashPasswordIfNeeded(valuesToSet);
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },

  beforeUpdate: async function beforeUpdate(valuesToSet, proceed) {
    try {
      if (valuesToSet.email) {
        valuesToSet.email = sails.services.authservice.normalizeEmail(valuesToSet.email);
      }
      await hashPasswordIfNeeded(valuesToSet);
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },
};
