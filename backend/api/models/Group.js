module.exports = {
  tableName: 'groups',

  attributes: {
    name: { type: 'string', required: true },
    description: { type: 'string', allowNull: true },
    owner: { type: 'string', required: true },
    memberIds: { type: 'json', defaultsTo: [] },

    // Papel de cada membro: `{ [userId]: 'ADMIN' | 'FISCAL' }`. O dono NÃO entra
    // aqui — MASTER é sempre derivado de `owner`, senão os dois campos podem
    // divergir e o grupo fica sem ninguém com poder total.
    // Membro sem entrada no mapa (colaborador anterior a este campo) resolve
    // para ADMIN, que é o poder que todo membro tinha antes dos papéis.
    memberRoles: { type: 'json', defaultsTo: {} },
    isPersonal: { type: 'boolean', defaultsTo: false },
    plannedSpending: { type: 'number', defaultsTo: 0 },
    plannedSpendingHistory: { type: 'json', defaultsTo: [] },

    // Eixo obra de cliente x obra própria. Define o rótulo da entrada de
    // dinheiro (recebimento vs. aporte de capital) e se a obra compõe o bloco
    // de resultado do Consolidado — só obra de CLIENTE tem receita/lucro
    // reconhecidos. Default PROPRIA: obra existente nenhuma passa a exibir
    // contrato ou lucro sem ser marcada explicitamente.
    tipoObra: { type: 'string', isIn: ['PROPRIA', 'CLIENTE'], defaultsTo: 'PROPRIA' },
    // Sem `defaultsTo`: com `allowNull` o Waterline já usa null como padrão, e
    // declarar os dois é erro de validação de schema no lift.
    valorContrato: { type: 'number', allowNull: true },

    // Ciclo de vida da obra. Obra existente (sem valor gravado) resolve para
    // EM_ANDAMENTO — é a situação mais segura para backfill, já que a obra já
    // está em uso. CONCLUIDO trava lançamentos (ver `GroupService.requireWrite`)
    // e é sempre exibida por último no Consolidado.
    situacao: {
      type: 'string',
      isIn: ['PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO'],
      defaultsTo: 'EM_ANDAMENTO',
    },
    // Valor de fechamento/venda da obra, só usado quando `situacao` é
    // CONCLUIDO. Vale para os dois tipos de obra: CLIENTE normalmente reusa
    // `valorContrato`, PROPRIA vendida guarda aqui o valor da venda.
    valorFechamento: { type: 'number', allowNull: true },

    // Equivalente a `valorContrato`, mas para obra PROPRIA: uma estimativa de
    // venda informada no planejamento, pra dar previsão de lucro antes da
    // obra terminar. Diferente de `valorContrato`, NÃO gera receita
    // reconhecida nem lucro reconhecido — só alimenta `lucroPrevisto`/
    // `lucroProjetado` (DashboardService). Obra própria não reconhece receita
    // formalmente, é regra já testada e mantida.
    valorVendaEsperada: { type: 'number', allowNull: true },
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
