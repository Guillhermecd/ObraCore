module.exports = {
  tableName: 'group_invites',

  attributes: {
    groupId: { type: 'string', required: true },
    inviterId: { type: 'string', required: true },
    inviteeId: { type: 'string', required: true },
    inviteeEmail: { type: 'string', required: true },
    status: { type: 'string', isIn: ['pending', 'accepted', 'declined', 'cancelled'], defaultsTo: 'pending' },
  },
};
