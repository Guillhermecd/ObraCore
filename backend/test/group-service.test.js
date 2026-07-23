const test = require('node:test');
const assert = require('node:assert/strict');

const DashboardService = require('../api/services/DashboardService');
const GroupService = require('../api/services/GroupService');

const DONO = 'u-dono';
const ADMIN = 'u-admin';
const FISCAL = 'u-fiscal';
const LEGADO = 'u-legado';
const ESTRANHO = 'u-estranho';

const OBRA_CLIENTE = {
  id: 'g1',
  name: 'Obra do Cliente',
  isPersonal: false,
  owner: DONO,
  memberIds: [DONO, ADMIN, FISCAL, LEGADO],
  // LEGADO não aparece aqui de propósito: é o colaborador que já existia antes
  // do campo `memberRoles`.
  memberRoles: { [ADMIN]: 'ADMIN', [FISCAL]: 'FISCAL' },
  plannedSpending: 100000,
  tipoObra: 'CLIENTE',
  valorContrato: 150000,
};

const EXPENSES = [
  { groupId: 'g1', tipo: 'SAIDA', amount: 50000, dataRealizada: '2026-01-10' },
  { groupId: 'g1', tipo: 'ENTRADA', amount: 80000, dataRealizada: '2026-01-05' },
];

// --- Regressão do bug relatado ------------------------------------------
// Uma obra de CLIENTE tem que chegar como CLIENTE para todo mundo: `tipoObra`
// é do registro do grupo, não do usuário que consulta. Se este teste passar a
// falhar, o Consolidado volta a mostrar a obra de um sócio em "Obras próprias".

test('tipoObra é o mesmo para dono, admin e fiscal — não depende de quem consulta', () => {
  const [projeto] = DashboardService.computeProjectPerformance([OBRA_CLIENTE], EXPENSES);
  assert.equal(projeto.tipoObra, 'CLIENTE');

  [DONO, ADMIN, FISCAL, LEGADO].forEach((userId) => {
    assert.equal(GroupService.serializeGroup(OBRA_CLIENTE, userId).tipoObra, 'CLIENTE');
  });
});

// --- Papéis ---------------------------------------------------------------

test('MASTER vem de owner, nunca do mapa de papéis', () => {
  assert.equal(GroupService.roleOf(OBRA_CLIENTE, DONO), 'MASTER');
  // Mesmo com uma entrada espúria no mapa, o dono continua MASTER.
  const comRuido = { ...OBRA_CLIENTE, memberRoles: { ...OBRA_CLIENTE.memberRoles, [DONO]: 'FISCAL' } };
  assert.equal(GroupService.roleOf(comRuido, DONO), 'MASTER');
});

test('membro sem entrada no mapa (anterior aos papéis) resolve para ADMIN', () => {
  assert.equal(GroupService.roleOf(OBRA_CLIENTE, LEGADO), 'ADMIN');
});

test('quem não é membro não tem papel nem permissão', () => {
  assert.equal(GroupService.roleOf(OBRA_CLIENTE, ESTRANHO), null);
  assert.equal(GroupService.can(OBRA_CLIENTE, ESTRANHO, 'write'), false);
  assert.equal(GroupService.can(OBRA_CLIENTE, ESTRANHO, 'viewFinanceiro'), false);
});

test('FISCAL só lê: não escreve, não convida, não gerencia', () => {
  assert.equal(GroupService.can(OBRA_CLIENTE, FISCAL, 'write'), false);
  assert.equal(GroupService.can(OBRA_CLIENTE, FISCAL, 'invite'), false);
  assert.equal(GroupService.can(OBRA_CLIENTE, FISCAL, 'manageMembers'), false);
  assert.equal(GroupService.can(OBRA_CLIENTE, FISCAL, 'viewFinanceiro'), false);
});

test('ADMIN escreve, convida e gerencia — mas não edita nem exclui a obra', () => {
  assert.equal(GroupService.can(OBRA_CLIENTE, ADMIN, 'write'), true);
  assert.equal(GroupService.can(OBRA_CLIENTE, ADMIN, 'invite'), true);
  assert.equal(GroupService.can(OBRA_CLIENTE, ADMIN, 'manageMembers'), true);
  assert.equal(GroupService.can(OBRA_CLIENTE, ADMIN, 'viewFinanceiro'), true);
  assert.equal(GroupService.can(OBRA_CLIENTE, ADMIN, 'editGroup'), false);
  assert.equal(GroupService.can(OBRA_CLIENTE, ADMIN, 'deleteGroup'), false);
});

test('MASTER pode tudo', () => {
  ['write', 'invite', 'manageMembers', 'editGroup', 'deleteGroup', 'viewFinanceiro'].forEach(
    (action) => assert.equal(GroupService.can(OBRA_CLIENTE, DONO, action), true),
  );
});

// --- Travas de gestão de membros -----------------------------------------

test('ADMIN não mexe no dono nem em outro ADMIN', () => {
  assert.ok(GroupService.assertCanActOnMember(OBRA_CLIENTE, ADMIN, DONO).error);
  assert.ok(GroupService.assertCanActOnMember(OBRA_CLIENTE, ADMIN, LEGADO).error);
  // Em fiscal, pode.
  assert.equal(GroupService.assertCanActOnMember(OBRA_CLIENTE, ADMIN, FISCAL).error, undefined);
});

test('MASTER mexe em qualquer colaborador, menos em si mesmo', () => {
  assert.equal(GroupService.assertCanActOnMember(OBRA_CLIENTE, DONO, ADMIN).error, undefined);
  assert.equal(GroupService.assertCanActOnMember(OBRA_CLIENTE, DONO, FISCAL).error, undefined);
  assert.ok(GroupService.assertCanActOnMember(OBRA_CLIENTE, DONO, DONO).error);
});

test('FISCAL não gerencia ninguém', () => {
  assert.ok(GroupService.assertCanActOnMember(OBRA_CLIENTE, FISCAL, ADMIN).error);
});

// --- Redação financeira ---------------------------------------------------

test('serializeGroup esconde valorContrato do FISCAL e mostra para os demais', () => {
  assert.equal(GroupService.serializeGroup(OBRA_CLIENTE, FISCAL).valorContrato, null);
  assert.equal(GroupService.serializeGroup(OBRA_CLIENTE, DONO).valorContrato, 150000);
  assert.equal(GroupService.serializeGroup(OBRA_CLIENTE, ADMIN).valorContrato, 150000);
});

test('redactFinanceiro zera contrato e resultado, preservando caixa e orçamento', () => {
  const [projeto] = DashboardService.computeProjectPerformance([OBRA_CLIENTE], EXPENSES);
  const redigido = GroupService.redactFinanceiro(projeto);

  assert.equal(redigido.valorContrato, null);
  assert.equal(redigido.receitaReconhecida, null);
  assert.equal(redigido.lucroReconhecido, null);
  assert.equal(redigido.margemPct, null);
  assert.equal(redigido.margemPrevistaPct, null);

  // O que o FISCAL continua vendo.
  assert.equal(redigido.tipoObra, 'CLIENTE');
  assert.equal(redigido.custoReal, projeto.custoReal);
  assert.equal(redigido.saldoAtual, projeto.saldoAtual);
  assert.equal(redigido.gastoPlanejado, projeto.gastoPlanejado);

  // E o original não foi mutado.
  assert.equal(projeto.valorContrato, 150000);
});

test('resultado consolidado de uma lista vazia não quebra', () => {
  const resultado = DashboardService.computeResultadoConsolidado([]);
  assert.equal(resultado.contratosAtivos, 0);
  assert.equal(resultado.receitaReconhecida, 0);
  assert.equal(resultado.margemPct, null);
});
