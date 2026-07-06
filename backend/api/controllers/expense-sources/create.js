module.exports = async function create(req, res) {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.badRequest({ message: 'Nome da fonte é obrigatório.' });
  }

  const groupId = await sails.services.groupservice.resolveGroupId(req);
  const normalizedName = name.trim();
  const existingSource = await ExpenseSource.findOne({
    groupId,
    name: normalizedName,
  });

  if (existingSource) {
    return res.status(409).json({ message: 'Já existe uma fonte com este nome.' });
  }

  const source = await ExpenseSource.create({
    name: normalizedName,
    owner: req.user.id,
    groupId,
  }).fetch();

  return res.status(201).json({ source });
};
