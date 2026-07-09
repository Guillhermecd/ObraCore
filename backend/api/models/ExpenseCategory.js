module.exports = {
  tableName: 'expense_categories',

  attributes: {
    name: { type: 'string', required: true },
    color: { type: 'string', allowNull: true },
    owner: { type: 'string', required: true },
    groupId: { type: 'string', required: true },
  },
};
