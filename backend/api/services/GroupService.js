function toArray(value) {
  return Array.isArray(value) ? value : [];
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
];

const SITUACOES_OBRA = ['PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO'];

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
      situacao: group.situacao || 'EM_ANDAMENTO',
      valorFechamento:
        !podeVerFinanceiro || group.valorFechamento === undefined ? null : group.valorFechamento,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  },

  /**
   * Valida e normaliza `tipoObra`/`valorContrato` para create e update, no
   * mesmo formato `{ error }` dos helpers de `plannedSpending`.
   *
   * `valorContrato` só existe em obra de CLIENTE — ao voltar para PROPRIA o
   * contrato é zerado, senão um valor órfão continuaria alimentando receita
   * reconhecida de uma obra que deixou de ser de cliente. Devolve `{}` quando
   * nenhum dos dois foi informado.
   */
  resolveObraFields(rawTipoObra, rawValorContrato, currentGroup) {
    const values = {};

    const tipoObra =
      rawTipoObra === undefined ? (currentGroup && currentGroup.tipoObra) || 'PROPRIA' : rawTipoObra;

    if (rawTipoObra !== undefined) {
      if (tipoObra !== 'PROPRIA' && tipoObra !== 'CLIENTE') {
        return { error: 'Tipo de obra inválido.' };
      }
      values.tipoObra = tipoObra;
    }

    if (tipoObra === 'PROPRIA') {
      // Só zera se o tipo mudou agora ou se o contrato veio no payload —
      // um update de nome não deve mexer em contrato.
      if (rawTipoObra !== undefined || rawValorContrato !== undefined) {
        values.valorContrato = null;
      }
      return values;
    }

    if (rawValorContrato === undefined) {
      return values;
    }

    if (rawValorContrato === null || rawValorContrato === '') {
      values.valorContrato = null;
      return values;
    }

    const parsedValorContrato = Number(rawValorContrato);
    if (Number.isNaN(parsedValorContrato) || parsedValorContrato < 0) {
      return { error: 'Valor do contrato inválido.' };
    }

    values.valorContrato = parsedValorContrato;
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

    if (rawValorFechamento === null || rawValorFechamento === '') {
      values.valorFechamento = null;
      return values;
    }

    const parsedValorFechamento = Number(rawValorFechamento);
    if (Number.isNaN(parsedValorFechamento) || parsedValorFechamento < 0) {
      return { error: 'Valor de fechamento inválido.' };
    }

    values.valorFechamento = parsedValorFechamento;
    return values;
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
