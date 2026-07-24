function toArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Parser comum pra campo monetário opcional: `''`/`null`/`undefined` viram
 * `null`; texto inválido ou negativo vira `{ error }`; senão o número.
 * Reaproveitado por `valorContrato`, `valorVendaEsperada` e `valorFechamento`
 * — todos seguem a mesma regra de validação.
 */
function parseMoneyOrNull(raw, errorMessage) {
  if (raw === null || raw === '') {
    return { value: null };
  }

  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed < 0) {
    return { error: errorMessage };
  }

  return { value: parsed };
}

function buildPlannedSpendingHistoryEntry(value, previousValue, user) {
  return {
    value,
    previousValue,
    changedBy: user.id,
    changedByName: user.name || null,
    changedAt: sails.services.timeservice.nowIso(),
  };
}

/**
 * Matriz de permissões — fonte única da verdade. `usePermissions` no frontend
 * espelha isto, mas só para não oferecer botão que vai dar 403: a autoridade é
 * daqui.
 *
 * ADMIN gerencia membros, mas `assertCanActOnMember` impede que ele mexa no
 * dono ou em outro ADMIN — sem isso dois admins podem se rebaixar mutuamente.
 */
const PERMISSIONS = {
  MASTER: {
    write: true,
    invite: true,
    manageMembers: true,
    editGroup: true,
    deleteGroup: true,
    viewFinanceiro: true,
  },
  ADMIN: {
    write: true,
    invite: true,
    manageMembers: true,
    editGroup: false,
    deleteGroup: false,
    viewFinanceiro: true,
  },
  FISCAL: {
    write: false,
    invite: false,
    manageMembers: false,
    editGroup: false,
    deleteGroup: false,
    viewFinanceiro: false,
  },
};

/** Campos que só quem tem `viewFinanceiro` pode enxergar. */
const CAMPOS_FINANCEIROS = [
  'valorContrato',
  'receitaReconhecida',
  'lucroReconhecido',
  'margemPct',
  'margemPrevistaPct',
  'valorFechamento',
  'lucroRealizado',
  'valorVendaEsperada',
  'lucroPrevisto',
  'custoProjetado',
  'lucroProjetado',
];

const SITUACOES_OBRA = ['PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO'];

/**
 * Nome fixo da categoria/fonte usadas pelo lançamento ENTRADA gerado
 * automaticamente ao concluir uma obra (ver `syncFechamentoExpense`). Servem
 * de chave de idempotência: o lançamento automático é sempre identificado
 * pelo `categoryId` desta categoria, nunca por um contador ou flag separada.
 */
const FECHAMENTO_CATEGORIA_NOME = 'Recebimento de fechamento';
const FECHAMENTO_FONTE_NOME = 'Fechamento de obra';

module.exports = {
  isMember(userRecord, groupId) {
    return toArray(userRecord && userRecord.groupIds).includes(groupId);
  },

  /**
   * Papel do usuário no grupo, ou `null` se ele não for membro. MASTER vem de
   * `owner` e nunca do mapa; membro sem entrada no mapa é ADMIN (ver comentário
   * em `Group.memberRoles`).
   */
  roleOf(group, userId) {
    if (!group || !userId) {
      return null;
    }
    if (group.owner === userId) {
      return 'MASTER';
    }
    if (!toArray(group.memberIds).includes(userId)) {
      return null;
    }
    const stored = (group.memberRoles || {})[userId];
    return stored === 'FISCAL' || stored === 'ADMIN' ? stored : 'ADMIN';
  },

  can(group, userId, action) {
    const role = this.roleOf(group, userId);
    return Boolean(role && PERMISSIONS[role] && PERMISSIONS[role][action]);
  },

  /**
   * Guarda dos controllers de escrita: carrega o grupo, checa `write` e já
   * responde 403. Devolve o grupo quando autorizado, `null` quando já respondeu
   * — o controller só precisa de `if (!group) { return; }`.
   */
  async requireWrite(req, res, groupId) {
    const group = await Group.findOne({ id: groupId });

    if (!group || !this.isMember(req.userRecord, groupId)) {
      res.status(404).json({ message: 'Obra não encontrada.' });
      return null;
    }

    if (!this.can(group, req.user.id, 'write')) {
      res.status(403).json({ message: 'Você não tem permissão para alterar esta obra.' });
      return null;
    }

    // Obra CONCLUIDO está congelada: entende-se que não haverá mais
    // lançamentos. Único ponto de trava — cobre expenses, categorias e fontes
    // de uma vez, já que todos passam por aqui. Reabrir (PATCH /groups/:id)
    // não passa por `requireWrite`, então continua liberado.
    if (group.situacao === 'CONCLUIDO') {
      res.status(423).json({ message: 'Obra concluída. Reabra a obra para lançar ou alterar.' });
      return null;
    }

    return group;
  },

  /**
   * Zera os campos de contrato/resultado para quem não pode vê-los. Todos já
   * são `number | null` e a UI trata `null` (o bloco de contrato some), então a
   * degradação é limpa. Esconder só no frontend não esconderia nada: a API
   * continuaria servindo o número.
   */
  redactFinanceiro(payload) {
    const redacted = { ...payload };
    CAMPOS_FINANCEIROS.forEach((field) => {
      if (field in redacted) {
        redacted[field] = null;
      }
    });
    return redacted;
  },

  serializeGroup(group, currentUserId) {
    const role = this.roleOf(group, currentUserId);
    const podeVerFinanceiro = this.can(group, currentUserId, 'viewFinanceiro');

    return {
      id: group.id,
      name: group.name,
      description: group.description || null,
      owner: group.owner,
      isPersonal: group.isPersonal,
      isOwner: group.owner === currentUserId,
      myRole: role,
      memberCount: toArray(group.memberIds).length,
      plannedSpending: group.plannedSpending || 0,
      plannedSpendingHistory: toArray(group.plannedSpendingHistory),
      tipoObra: group.tipoObra || 'PROPRIA',
      valorContrato:
        !podeVerFinanceiro || group.valorContrato === undefined ? null : group.valorContrato,
      valorVendaEsperada:
        !podeVerFinanceiro || group.valorVendaEsperada === undefined
          ? null
          : group.valorVendaEsperada,
      situacao: group.situacao || 'EM_ANDAMENTO',
      valorFechamento:
        !podeVerFinanceiro || group.valorFechamento === undefined ? null : group.valorFechamento,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  },

  /**
   * Valida e normaliza `tipoObra`/`valorContrato`/`valorVendaEsperada` para
   * create e update, no mesmo formato `{ error }` dos helpers de
   * `plannedSpending`.
   *
   * `valorContrato` só existe em obra CLIENTE, `valorVendaEsperada` só em
   * PROPRIA — cada um zera quando a obra deixa de ser do tipo correspondente,
   * senão um valor órfão continuaria alimentando cálculo de uma obra que já
   * não é mais daquele tipo. Devolve `{}` quando nada foi informado.
   */
  resolveObraFields(rawTipoObra, rawValorContrato, rawValorVendaEsperada, currentGroup) {
    const values = {};

    const tipoObra =
      rawTipoObra === undefined ? (currentGroup && currentGroup.tipoObra) || 'PROPRIA' : rawTipoObra;

    if (rawTipoObra !== undefined) {
      if (tipoObra !== 'PROPRIA' && tipoObra !== 'CLIENTE') {
        return { error: 'Tipo de obra inválido.' };
      }
      values.tipoObra = tipoObra;
    }

    const tipoMudou = rawTipoObra !== undefined;

    // valorContrato: só CLIENTE. Zera se o tipo mudou agora (saiu de CLIENTE)
    // ou se veio no payload sem a obra ser CLIENTE — update de nome sozinho
    // não deve mexer em contrato.
    if (tipoObra !== 'CLIENTE') {
      if (tipoMudou || rawValorContrato !== undefined) {
        values.valorContrato = null;
      }
    } else if (rawValorContrato !== undefined) {
      const parsedValorContrato = parseMoneyOrNull(rawValorContrato, 'Valor do contrato inválido.');
      if (parsedValorContrato.error) {
        return { error: parsedValorContrato.error };
      }
      values.valorContrato = parsedValorContrato.value;
    }

    // valorVendaEsperada: só PROPRIA, mesma regra simétrica.
    if (tipoObra !== 'PROPRIA') {
      if (tipoMudou || rawValorVendaEsperada !== undefined) {
        values.valorVendaEsperada = null;
      }
    } else if (rawValorVendaEsperada !== undefined) {
      const parsedValorVendaEsperada = parseMoneyOrNull(
        rawValorVendaEsperada,
        'Valor de venda esperado inválido.',
      );
      if (parsedValorVendaEsperada.error) {
        return { error: parsedValorVendaEsperada.error };
      }
      values.valorVendaEsperada = parsedValorVendaEsperada.value;
    }

    return values;
  },

  /**
   * Valida e normaliza `situacao`/`valorFechamento` para create e update, no
   * mesmo formato `{ error }` de `resolveObraFields`.
   *
   * `valorFechamento` só é usado quando a obra está CONCLUIDO, mas não é
   * zerado ao reabrir — se a obra for concluída de novo, o último valor
   * informado continua ali como sugestão, em vez de se perder.
   */
  resolveSituacao(rawSituacao, rawValorFechamento, currentGroup) {
    const values = {};

    const situacao =
      rawSituacao === undefined ? (currentGroup && currentGroup.situacao) || 'EM_ANDAMENTO' : rawSituacao;

    if (rawSituacao !== undefined) {
      if (!SITUACOES_OBRA.includes(situacao)) {
        return { error: 'Situação da obra inválida.' };
      }
      values.situacao = situacao;
    }

    if (rawValorFechamento === undefined) {
      return values;
    }

    if (situacao !== 'CONCLUIDO') {
      return { error: 'Valor de fechamento só pode ser informado com a obra concluída.' };
    }

    const parsedValorFechamento = parseMoneyOrNull(rawValorFechamento, 'Valor de fechamento inválido.');
    if (parsedValorFechamento.error) {
      return { error: parsedValorFechamento.error };
    }

    values.valorFechamento = parsedValorFechamento.value;
    return values;
  },

  /**
   * Mantém em sincronia o lançamento ENTRADA "Recebimento de fechamento" da
   * obra: garante que, sempre que a obra estiver CONCLUIDO com um
   * `valorFechamento` definido, exista exatamente um lançamento cobrindo a
   * diferença entre o fechamento e o que já foi aportado — assim o saldo de
   * caixa passa a refletir o lucro realizado (valorFechamento − custoReal)
   * sem exigir que o usuário lance manualmente o recebimento do
   * cliente/comprador.
   *
   * Rodado a cada update de `situacao`/`valorFechamento` (fechar, reabrir ou
   * editar o valor já fechado com a obra concluída) — nunca só na transição
   * para CONCLUIDO, porque a obra pode ser reaberta e fechada de novo, ou o
   * valor pode mudar depois de já concluída.
   *
   * O lançamento automático é identificado pelo `categoryId` da categoria
   * dedicada (find-or-create por nome), nunca por uma flag separada. Reabrir
   * a obra (ou zerar o valor de fechamento) remove o lançamento — o saldo
   * volta a refletir só o dinheiro de fato lançado.
   */
  async syncFechamentoExpense(group, actingUserId) {
    const category = await ExpenseCategory.findOne({
      groupId: group.id,
      name: FECHAMENTO_CATEGORIA_NOME,
    });
    const existing = category
      ? await Expense.findOne({ groupId: group.id, categoryId: category.id })
      : null;

    const deveExistir = group.situacao === 'CONCLUIDO' && group.valorFechamento != null;
    if (!deveExistir) {
      if (existing) {
        await Expense.destroyOne({ id: existing.id });
      }
      return;
    }

    const groupExpenses = await Expense.find({ groupId: group.id });
    // Exclui o próprio lançamento automático da soma — senão, ao recalcular
    // numa segunda edição, o valor já contado nele "some" do que falta cobrir
    // e o lançamento colapsa para 0 a cada novo save.
    const totalAportadoOutros = groupExpenses.reduce((sum, expense) => {
      if (existing && expense.id === existing.id) {
        return sum;
      }
      return expense.tipo === 'ENTRADA' && expense.dataRealizada ? sum + expense.amount : sum;
    }, 0);

    const desiredAmount =
      Math.round(Math.max(group.valorFechamento - totalAportadoOutros, 0) * 100) / 100;

    if (desiredAmount <= 0) {
      if (existing) {
        await Expense.destroyOne({ id: existing.id });
      }
      return;
    }

    if (existing) {
      await Expense.updateOne({ id: existing.id }).set({ amount: desiredAmount });
      return;
    }

    const resolvedCategory =
      category ||
      (await ExpenseCategory.create({
        name: FECHAMENTO_CATEGORIA_NOME,
        owner: actingUserId,
        groupId: group.id,
        tipo: 'ENTRADA',
      }).fetch());

    let source = await ExpenseSource.findOne({ groupId: group.id, name: FECHAMENTO_FONTE_NOME });
    if (!source) {
      source = await ExpenseSource.create({
        name: FECHAMENTO_FONTE_NOME,
        owner: actingUserId,
        groupId: group.id,
        tipo: 'ENTRADA',
      }).fetch();
    }

    const hoje = new Date().toISOString().slice(0, 10);
    await Expense.create({
      date: hoje,
      categoryId: resolvedCategory.id,
      sourceId: source.id,
      supplier: null,
      paymentMethod: 'Transferência',
      amount: desiredAmount,
      notes: 'Gerado automaticamente ao concluir a obra — recebimento referente ao valor de fechamento.',
      owner: actingUserId,
      groupId: group.id,
      tipo: 'ENTRADA',
      dataPrevista: hoje,
      dataRealizada: hoje,
    }).fetch();
  },

  /**
   * Valida um novo valor de gasto planejado e, se diferente do atual, monta os
   * campos a atualizar (valor + histórico com a alteração). Retorna
   * `{ error }` quando o valor é inválido, ou `{}` quando não há mudança.
   */
  resolvePlannedSpendingUpdate(group, rawPlannedSpending, user) {
    const parsedPlannedSpending = Number(rawPlannedSpending);
    if (Number.isNaN(parsedPlannedSpending) || parsedPlannedSpending < 0) {
      return { error: 'Gasto planejado inválido.' };
    }

    const currentPlannedSpending = group.plannedSpending || 0;
    if (parsedPlannedSpending === currentPlannedSpending) {
      return {};
    }

    return {
      plannedSpending: parsedPlannedSpending,
      plannedSpendingHistory: [
        ...toArray(group.plannedSpendingHistory),
        buildPlannedSpendingHistoryEntry(parsedPlannedSpending, currentPlannedSpending, user),
      ],
    };
  },

  /**
   * Normaliza o gasto planejado informado na criação do grupo, já no formato
   * pronto para `Group.create({...})`. Retorna `{ error }` quando inválido.
   */
  buildPlannedSpendingOnCreate(rawPlannedSpending, user) {
    if (rawPlannedSpending === undefined || rawPlannedSpending === null || rawPlannedSpending === '') {
      return { plannedSpending: 0, plannedSpendingHistory: [] };
    }

    const parsedPlannedSpending = Number(rawPlannedSpending);
    if (Number.isNaN(parsedPlannedSpending) || parsedPlannedSpending < 0) {
      return { error: 'Gasto planejado inválido.' };
    }

    return {
      plannedSpending: parsedPlannedSpending,
      plannedSpendingHistory: parsedPlannedSpending > 0
        ? [buildPlannedSpendingHistoryEntry(parsedPlannedSpending, 0, user)]
        : [],
    };
  },

  /**
   * Resolve o grupo ativo da requisição a partir do header `X-Group-Id`,
   * validando que o usuário é membro dele. Sem header válido, cai para o
   * grupo Pessoal do usuário (criando-o se ainda não existir).
   */
  async resolveGroupId(req) {
    const requestedGroupId = req.headers['x-group-id'];
    const userRecord = req.userRecord;

    if (requestedGroupId && this.isMember(userRecord, requestedGroupId)) {
      return requestedGroupId;
    }

    const personalGroup = await this.ensurePersonalGroup(userRecord);
    return personalGroup.id;
  },

  async ensurePersonalGroup(userRecord) {
    const groupIds = toArray(userRecord.groupIds);

    if (groupIds.length > 0) {
      const existingGroups = await Group.find({ id: { in: groupIds } });
      const personalGroup = existingGroups.find((group) => group.isPersonal);
      if (personalGroup) {
        return personalGroup;
      }
    }

    const personalGroup = await Group.create({
      name: 'Pessoal',
      owner: userRecord.id,
      memberIds: [userRecord.id],
      isPersonal: true,
    }).fetch();

    const updatedGroupIds = [...groupIds, personalGroup.id];
    await User.updateOne({ id: userRecord.id }).set({ groupIds: updatedGroupIds });
    userRecord.groupIds = updatedGroupIds;

    return personalGroup;
  },

  /**
   * Regras de quem pode mexer em quem. MASTER mexe em qualquer um menos em si
   * mesmo; ADMIN só mexe em FISCAL. Devolve `{ error }` no mesmo formato dos
   * outros helpers deste serviço.
   */
  assertCanActOnMember(group, actorId, targetId) {
    if (!this.can(group, actorId, 'manageMembers')) {
      return { error: 'Você não tem permissão para gerenciar colaboradores desta obra.' };
    }

    if (targetId === group.owner) {
      return { error: 'O criador da obra não pode ser alterado nem removido.' };
    }

    const actorRole = this.roleOf(group, actorId);
    const targetRole = this.roleOf(group, targetId);

    if (!targetRole) {
      return { error: 'Colaborador não encontrado nesta obra.' };
    }

    if (actorRole === 'ADMIN' && targetRole === 'ADMIN') {
      return { error: 'Apenas o criador da obra pode alterar outro administrador.' };
    }

    return {};
  },

  async addMember(group, userRecord, role) {
    const memberIds = toArray(group.memberIds);
    const normalizedRole = role === 'ADMIN' ? 'ADMIN' : 'FISCAL';
    const valuesToSet = {
      memberRoles: { ...(group.memberRoles || {}), [userRecord.id]: normalizedRole },
    };

    if (!memberIds.includes(userRecord.id)) {
      valuesToSet.memberIds = [...memberIds, userRecord.id];
    }

    await Group.updateOne({ id: group.id }).set(valuesToSet);

    const groupIds = toArray(userRecord.groupIds);
    if (!groupIds.includes(group.id)) {
      await User.updateOne({ id: userRecord.id }).set({ groupIds: [...groupIds, group.id] });
    }
  },

  async setMemberRole(group, userId, role) {
    const memberRoles = { ...(group.memberRoles || {}) };
    memberRoles[userId] = role;
    await Group.updateOne({ id: group.id }).set({ memberRoles });
  },

  async removeMember(group, userRecord) {
    const memberRoles = { ...(group.memberRoles || {}) };
    delete memberRoles[userRecord.id];

    const memberIds = toArray(group.memberIds);
    await Group.updateOne({ id: group.id }).set({
      memberIds: memberIds.filter((id) => id !== userRecord.id),
      memberRoles,
    });

    const groupIds = toArray(userRecord.groupIds);
    await User.updateOne({ id: userRecord.id }).set({
      groupIds: groupIds.filter((id) => id !== group.id),
    });
  },
};
