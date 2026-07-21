function nowIso() {
  return new Date().toISOString();
}

module.exports = {
  tableName: 'branding',

  attributes: {
    key: { type: 'string', required: true, unique: true },
    companyName: { type: 'string', required: true },
    logoUrl: { type: 'string', allowNull: true },
    faviconUrl: { type: 'string', allowNull: true },
    primaryColor: { type: 'string', required: true },
    secondaryColor: { type: 'string', required: true },
    accentColor: { type: 'string', required: true },
    gradientFrom: { type: 'string', allowNull: true },
    gradientTo: { type: 'string', allowNull: true },
  },

  beforeCreate: async function beforeCreate(valuesToSet, proceed) {
    try {
      if (valuesToSet.key) {
        valuesToSet.key = valuesToSet.key.toLowerCase().trim();
      }
      const timestamp = nowIso();
      valuesToSet.createdAt = timestamp;
      valuesToSet.updatedAt = timestamp;
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },

  beforeUpdate: async function beforeUpdate(valuesToSet, proceed) {
    try {
      if (valuesToSet.key) {
        valuesToSet.key = valuesToSet.key.toLowerCase().trim();
      }
      valuesToSet.updatedAt = nowIso();
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },
};
