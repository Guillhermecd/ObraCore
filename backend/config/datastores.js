module.exports.datastores = {
  default: {
    adapter: 'sails-mongo',
    url: process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/bimd_template',
  },
};
