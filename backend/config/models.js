module.exports.models = {
  schema: true,
  migrate: process.env.NODE_ENV === 'production' ? 'safe' : 'alter',
  attributes: {
    id: { type: 'string', columnName: '_id' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  dataEncryptionKeys: {
    default: process.env.DATA_ENCRYPTION_KEY || 'p/o8X2uJ0mvlWsrV6pp4wCLBEA/tGJLoQ+D3IML+Hy8=',
  },
  cascadeOnDestroy: true,
};
