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
    comprovante: { type: 'json' },
    owner: { type: 'string', required: true },
    groupId: { type: 'string', required: true },
  },
};
