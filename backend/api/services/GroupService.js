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

/**
 * Cria a membership de forma segura contra concorrência: tenta criar direto
 * (em vez de "buscar, depois criar" como `findOrCreate`, que tem uma janela
 * de corrida entre as duas etapas) e, se outra requisição concorrente já
 * criou a mesma linha um instante antes, o índice único em `(group, user)`
 * (ver `ensureIndexes`) rejeita com `E_UNIQUE` — nesse caso apenas ignora,
 * já que o resultado desejado (a membership existir) já foi alcançado.
 */
async function ensureMembership(groupId, userId) {
  try {
    await GroupMember.create({ group: groupId, user: userId });
  } catch (error) {
    if (error.code !== 'E_UNIQUE') {
      throw error;
    }
  }
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

    let personalGroup = existingPersonalGroup;
    if (!personalGroup) {
      try {
        personalGroup = await Group.create({
          name: 'Pessoal',
          owner: userRecord.id,
          isPersonal: true,
        }).fetch();
      } catch (error) {
        if (error.code !== 'E_UNIQUE') {
          throw error;
        }
        // Outra requisição concorrente já criou o grupo Pessoal deste usuário
        // (índice único em `(owner)` para `isPersonal: true`, ver `ensureIndexes`).
        personalGroup = await Group.findOne({ owner: userRecord.id, isPersonal: true });
      }
    }

    await ensureMembership(personalGroup.id, userRecord.id);

    return personalGroup;
  },

  async addMember(group, userRecord) {
    await ensureMembership(group.id, userRecord.id);
  },

  /**
   * Garante os índices únicos que fecham as corridas de concorrência de
   * `ensurePersonalGroup`/`addMember`: um usuário só pode ter um grupo
   * Pessoal (índice parcial, não afeta grupos compartilhados) e só pode
   * aparecer uma vez como membro do mesmo grupo. Chamado uma vez no boot
   * (`config/bootstrap.js`); `createIndex` é idempotente.
   */
  async ensureIndexes() {
    await GroupMember.getDatastore().manager.collection('group_members').createIndex(
      { group: 1, user: 1 },
      { unique: true },
    );
    await Group.getDatastore().manager.collection('groups').createIndex(
      { owner: 1 },
      { unique: true, partialFilterExpression: { isPersonal: true } },
    );
  },

  async removeMember(group, userRecord) {
    await GroupMember.destroyOne({ group: group.id, user: userRecord.id });
  },
};
