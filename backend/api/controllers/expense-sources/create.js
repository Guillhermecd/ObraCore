module.exports = async function create(req, res) {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.badRequest({ message: 'Nome da fonte é obrigatório.' });
  }

  const normalizedName = name.trim();
  const existingSource = await ExpenseSource.findOne({
    owner: req.user.id,
    name: normalizedName,
  });

  if (existingSource) {
    return res.status(409).json({ message: 'Já existe uma fonte com este nome.' });
  }

  const source = await ExpenseSource.create({
    name: normalizedName,
    owner: req.user.id,
  }).fetch();

  return res.status(201).json({ source });
};
