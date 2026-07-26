const CONFIG = { listKey: 'sources' };

module.exports = async function list(req, res) {
  return sails.services.taxonomyservice.list(ExpenseSource, CONFIG, req, res);
};
