const VALID_TIPOS = ['ENTRADA', 'SAIDA', 'AMBOS'];

/**
 * CRUD raso de categoria/fonte de lançamento — os dois recursos têm a mesma
 * forma (nome único por obra, tipo ENTRADA/SAIDA/AMBOS, bloqueado para
 * exclusão enquanto algum lançamento o referencia), então os controllers de
 * `expense-categories/*` e `expense-sources/*` só configuram o Model e os
 * textos e delegam para cá.
 *
 * `config`:
 *   - `label`/`Label`: nome da entidade em português, minúsculo/maiúsculo,
 *     usado nas mensagens de erro.
 *   - `responseKey`: chave do objeto criado na resposta (`category`/`source`).
 *   - `listKey`: chave da lista na resposta (`categories`/`sources`).
 *   - `usageField`: campo em `Expense` que referencia este recurso
 *     (`categoryId`/`sourceId`).
 *   - `extraCreateFields(body)`: campos extras específicos do recurso ao
 *     criar (ex.: `color`, só em categoria).
 */
module.exports = {
  async create(Model, config, req, res) {
    const { name, tipo } = req.body;

    if (!name || !name.trim()) {
      return res.badRequest({ message: `Nome da ${config.label} é obrigatório.` });
    }

    const normalizedTipo = tipo || 'SAIDA';
    if (!VALID_TIPOS.includes(normalizedTipo)) {
      return res.badRequest({ message: 'Tipo inválido.' });
    }

    const groupId = await sails.services.groupservice.resolveGroupId(req);

    if (!(await sails.services.groupservice.requireWrite(req, res, groupId))) {
      return undefined;
    }

    const normalizedName = name.trim();
    const existing = await Model.findOne({
      groupId,
      name: normalizedName,
    });

    if (existing) {
      return res.status(409).json({ message: `Já existe uma ${config.label} com este nome.` });
    }

    const record = await Model.create({
      name: normalizedName,
      owner: req.user.id,
      groupId,
      tipo: normalizedTipo,
      ...(config.extraCreateFields ? config.extraCreateFields(req.body) : {}),
    }).fetch();

    return res.status(201).json({ [config.responseKey]: record });
  },

  async list(Model, config, req, res) {
    const groupId = await sails.services.groupservice.resolveGroupId(req);
    const records = await Model.find({ groupId }).sort('name ASC');

    return res.json({ [config.listKey]: records });
  },

  async remove(Model, config, req, res) {
    const groupId = await sails.services.groupservice.resolveGroupId(req);

    if (!(await sails.services.groupservice.requireWrite(req, res, groupId))) {
      return undefined;
    }

    const record = await Model.findOne({ id: req.params.id, groupId });

    if (!record) {
      return res.status(404).json({ message: `${config.Label} não encontrada.` });
    }

    const expensesUsingRecord = await Expense.count({
      groupId,
      [config.usageField]: record.id,
    });

    if (expensesUsingRecord > 0) {
      return res
        .status(409)
        .json({ message: `${config.Label} em uso por lançamentos e não pode ser excluída.` });
    }

    await Model.destroyOne({ id: record.id });

    return res.json({ message: `${config.Label} excluída.` });
  },
};
