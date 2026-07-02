function nowIso() {
  return new Date().toISOString();
}

module.exports = {
  tableName: 'expenses',

  attributes: {
    date: { type: 'string', required: true },
    categoryId: { type: 'string', required: true },
    sourceId: { type: 'string', required: true },
    supplier: { type: 'string', allowNull: true },
    paymentMethod: { type: 'string', required: true },
    amount: { type: 'number', required: true },
    notes: { type: 'string', allowNull: true },
    owner: { type: 'string', required: true },
  },

  beforeCreate: async function beforeCreate(valuesToSet, proceed) {
    try {
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
      valuesToSet.updatedAt = nowIso();
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },
};
