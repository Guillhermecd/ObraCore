module.exports = {
  tableName: 'expense_sources',

  attributes: {
    name: { type: 'string', required: true },
    owner: { type: 'string', required: true },
    groupId: { type: 'string', required: true },

    // Caixa consolidado (aditivo): para o seletor do form filtrar fontes
    // conforme o tipo do lançamento sendo criado. AMBOS = serve para os dois.
    tipo: { type: 'string', isIn: ['ENTRADA', 'SAIDA', 'AMBOS'], defaultsTo: 'SAIDA' },
  },

  beforeCreate: async function beforeCreate(valuesToSet, proceed) {
    try {
      sails.services.timeservice.applyCreateTimestamps(valuesToSet);
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },

  beforeUpdate: async function beforeUpdate(valuesToSet, proceed) {
    try {
      sails.services.timeservice.applyUpdateTimestamp(valuesToSet);
      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },
};
