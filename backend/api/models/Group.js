module.exports = {
  tableName: 'groups',

  attributes: {
    name: { type: 'string', required: true },
    description: { type: 'string', allowNull: true },
    owner: { type: 'string', required: true },
    isPersonal: { type: 'boolean', defaultsTo: false },
    plannedSpending: { type: 'number', defaultsTo: 0 },
    plannedSpendingHistory: { type: 'json', defaultsTo: [] },
    members: { collection: 'groupmember', via: 'group' },
  },
};
