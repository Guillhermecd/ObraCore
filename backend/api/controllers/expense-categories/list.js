const CONFIG = { listKey: 'categories' };

module.exports = async function list(req, res) {
  return sails.services.taxonomyservice.list(ExpenseCategory, CONFIG, req, res);
};
