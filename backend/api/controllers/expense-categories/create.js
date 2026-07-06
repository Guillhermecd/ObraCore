module.exports = async function create(req, res) {
  const { name, color } = req.body;

  if (!name || !name.trim()) {
    return res.badRequest({ message: 'Nome da categoria é obrigatório.' });
  }

  const groupId = await sails.services.groupservice.resolveGroupId(req);
  const normalizedName = name.trim();
  const existingCategory = await ExpenseCategory.findOne({
    groupId,
    name: normalizedName,
  });

  if (existingCategory) {
    return res.status(409).json({ message: 'Já existe uma categoria com este nome.' });
  }

  const category = await ExpenseCategory.create({
    name: normalizedName,
    color: color || null,
    owner: req.user.id,
    groupId,
  }).fetch();

  return res.status(201).json({ category });
};
