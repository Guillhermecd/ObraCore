module.exports = async function create(req, res) {
  const { name, tipo } = req.body;

  if (!name || !name.trim()) {
    return res.badRequest({ message: 'Nome da fonte é obrigatório.' });
  }

  const normalizedTipo = tipo || 'SAIDA';
  if (!['ENTRADA', 'SAIDA', 'AMBOS'].includes(normalizedTipo)) {
    return res.badRequest({ message: 'Tipo inválido.' });
  }

  const groupId = await sails.services.groupservice.resolveGroupId(req);

  if (!(await sails.services.groupservice.requireWrite(req, res, groupId))) {
    return;
  }

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
    tipo: normalizedTipo,
  }).fetch();

  return res.status(201).json({ source });
};
