const CONFIG = {
  Label: 'Fonte',
  usageField: 'sourceId',
};

module.exports = async function remove(req, res) {
  return sails.services.taxonomyservice.remove(ExpenseSource, CONFIG, req, res);
};
