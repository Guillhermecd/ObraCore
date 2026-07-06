function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildPlannedSpendingHistoryEntry(value, previousValue, user) {
  return {
    value,
    previousValue,
    changedBy: user.id,
    changedByName: user.name || null,
    changedAt: new Date().toISOString(),
  };
}

module.exports = {
  isMember(userRecord, groupId) {
    return toArray(userRecord && userRecord.groupIds).includes(groupId);
  },

  serializeGroup(group, currentUserId) {
    return {
      id: group.id,
      name: group.name,
      description: group.description || null,
      owner: group.owner,
      isPersonal: group.isPersonal,
      isOwner: group.owner === currentUserId,
      memberCount: toArray(group.memberIds).length,
      plannedSpending: group.plannedSpending || 0,
      plannedSpendingHistory: toArray(group.plannedSpendingHistory),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
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

  async addMember(group, userRecord) {
    const memberIds = toArray(group.memberIds);
    if (!memberIds.includes(userRecord.id)) {
      await Group.updateOne({ id: group.id }).set({ memberIds: [...memberIds, userRecord.id] });
    }

    const groupIds = toArray(userRecord.groupIds);
    if (!groupIds.includes(group.id)) {
      await User.updateOne({ id: userRecord.id }).set({ groupIds: [...groupIds, group.id] });
    }
  },

  async removeMember(group, userRecord) {
    const memberIds = toArray(group.memberIds);
    await Group.updateOne({ id: group.id }).set({
      memberIds: memberIds.filter((id) => id !== userRecord.id),
    });

    const groupIds = toArray(userRecord.groupIds);
    await User.updateOne({ id: userRecord.id }).set({
      groupIds: groupIds.filter((id) => id !== group.id),
    });
  },
};
