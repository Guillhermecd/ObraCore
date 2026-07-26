const CONFIG = {
  label: 'categoria',
  Label: 'Categoria',
  responseKey: 'category',
  extraCreateFields: (body) => ({ color: body.color || null }),
};

module.exports = async function create(req, res) {
  return sails.services.taxonomyservice.create(ExpenseCategory, CONFIG, req, res);
};
