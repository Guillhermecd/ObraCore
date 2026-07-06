function nowIso() {
  return new Date().toISOString();
}

module.exports = {
  tableName: 'groups',

  attributes: {
    name: { type: 'string', required: true },
    description: { type: 'string', allowNull: true },
    owner: { type: 'string', required: true },
    memberIds: { type: 'json', defaultsTo: [] },
    isPersonal: { type: 'boolean', defaultsTo: false },
    plannedSpending: { type: 'number', defaultsTo: 0 },
    plannedSpendingHistory: { type: 'json', defaultsTo: [] },
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
