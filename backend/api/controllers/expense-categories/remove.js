const CONFIG = {
  Label: 'Categoria',
  usageField: 'categoryId',
};

module.exports = async function remove(req, res) {
  return sails.services.taxonomyservice.remove(ExpenseCategory, CONFIG, req, res);
};
