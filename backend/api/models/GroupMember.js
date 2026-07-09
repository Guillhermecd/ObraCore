module.exports = {
  tableName: 'group_members',

  attributes: {
    group: { model: 'group', required: true },
    user: { model: 'user', required: true },
  },
};
