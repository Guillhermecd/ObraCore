function nowIso() {
  return new Date().toISOString();
}

module.exports = {
  tableName: 'expense_categories',

  attributes: {
    name: { type: 'string', required: true },
    color: { type: 'string', allowNull: true },
    owner: { type: 'string', required: true },
    groupId: { type: 'string', required: true },

    // Caixa consolidado (aditivo): para o seletor do form filtrar categorias
    // conforme o tipo do lançamento sendo criado. AMBOS = serve para os dois.
    tipo: { type: 'string', isIn: ['ENTRADA', 'SAIDA', 'AMBOS'], defaultsTo: 'SAIDA' },
  },

  beforeCreate: async function beforeCreate(valuesToSet, proceed) {
    try {
      const timestamp = nowIso();
      valuesToSet.createdAt = timestamp;
      valuesToSet.updatedAt = timestamp;
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },

  beforeUpdate: async function beforeUpdate(valuesToSet, proceed) {
    try {
      valuesToSet.updatedAt = nowIso();
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },
};
