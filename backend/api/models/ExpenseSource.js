module.exports = {
  tableName: 'expense_sources',

  attributes: {
    name: { type: 'string', required: true },
    owner: { type: 'string', required: true },
    groupId: { type: 'string', required: true },
  },
};
