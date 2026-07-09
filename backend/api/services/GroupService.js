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

/**
 * Quando existe mais de um grupo Pessoal para o mesmo dono (dado legado ou
 * corrida de concorrência em `ensurePersonalGroup`), escolhe o "de verdade":
 * primeiro o que já tem membership, senão o que já tem algum lançamento,
 * categoria ou fonte associado, senão o mais antigo. Nunca escolhe por
 * ordem de criação quando algum candidato já tem dado real.
 */
async function resolveCanonicalPersonalGroup(groups, userId) {
  for (const group of groups) {
    if (await GroupMember.count({ group: group.id, user: userId })) {
      return group;
    }
  }

  for (const group of groups) {
    const [expenseCount, categoryCount, sourceCount] = await Promise.all([
      Expense.count({ groupId: group.id }),
      ExpenseCategory.count({ groupId: group.id }),
      ExpenseSource.count({ groupId: group.id }),
    ]);
    if (expenseCount > 0 || categoryCount > 0 || sourceCount > 0) {
      return group;
    }
  }

  return groups[0];
}

module.exports = {
  async isMember(userRecord, groupId) {
    const count = await GroupMember.count({ user: userRecord.id, group: groupId });
    return count > 0;
  },

  serializeGroup(group, currentUserId, memberCount) {
    return {
      id: group.id,
      name: group.name,
      description: group.description || null,
      owner: group.owner,
      isPersonal: group.isPersonal,
      isOwner: group.owner === currentUserId,
      memberCount,
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

    if (requestedGroupId && (await this.isMember(userRecord, requestedGroupId))) {
      return requestedGroupId;
    }

    const personalGroup = await this.ensurePersonalGroup(userRecord);
    return personalGroup.id;
  },

  async ensurePersonalGroup(userRecord) {
    const existingPersonalGroups = await Group.find({ owner: userRecord.id, isPersonal: true }).sort('createdAt ASC');

    let existingPersonalGroup;
    if (existingPersonalGroups.length > 1) {
      existingPersonalGroup = await resolveCanonicalPersonalGroup(existingPersonalGroups, userRecord.id);
    } else {
      existingPersonalGroup = existingPersonalGroups[0];
    }

    const personalGroup = existingPersonalGroup || await Group.create({
      name: 'Pessoal',
      owner: userRecord.id,
      isPersonal: true,
    }).fetch();

    await GroupMember.findOrCreate(
      { group: personalGroup.id, user: userRecord.id },
      { group: personalGroup.id, user: userRecord.id },
    );

    return personalGroup;
  },

  async addMember(group, userRecord) {
    await GroupMember.findOrCreate(
      { group: group.id, user: userRecord.id },
      { group: group.id, user: userRecord.id },
    );
  },

  async removeMember(group, userRecord) {
    await GroupMember.destroyOne({ group: group.id, user: userRecord.id });
  },
};
