const CONFIG = {
  label: 'fonte',
  Label: 'Fonte',
  responseKey: 'source',
};

module.exports = async function create(req, res) {
  return sails.services.taxonomyservice.create(ExpenseSource, CONFIG, req, res);
};
