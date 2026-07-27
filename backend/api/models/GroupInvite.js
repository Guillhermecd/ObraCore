module.exports = {
  tableName: 'group_invites',

  attributes: {
    groupId: { type: 'string', required: true },
    inviterId: { type: 'string', required: true },
    inviteeId: { type: 'string', required: true },
    inviteeEmail: { type: 'string', required: true },
    status: { type: 'string', isIn: ['pending', 'accepted', 'declined', 'cancelled'], defaultsTo: 'pending' },

    // Papel com que o convidado entra ao aceitar. Convites pendentes criados
    // antes deste campo não o têm — quem lê deve cair para FISCAL.
    role: { type: 'string', isIn: ['ADMIN', 'FISCAL'], defaultsTo: 'FISCAL' },
  },

  beforeCreate: async function beforeCreate(valuesToSet, proceed) {
    try {
      sails.services.timeservice.applyCreateTimestamps(valuesToSet);
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },

  beforeUpdate: async function beforeUpdate(valuesToSet, proceed) {
    try {
      sails.services.timeservice.applyUpdateTimestamp(valuesToSet);
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },
};
