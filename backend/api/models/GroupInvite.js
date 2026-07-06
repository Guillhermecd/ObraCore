function nowIso() {
  return new Date().toISOString();
}

module.exports = {
  tableName: 'group_invites',

  attributes: {
    groupId: { type: 'string', required: true },
    inviterId: { type: 'string', required: true },
    inviteeId: { type: 'string', required: true },
    inviteeEmail: { type: 'string', required: true },
    status: { type: 'string', isIn: ['pending', 'accepted', 'declined', 'cancelled'], defaultsTo: 'pending' },
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
