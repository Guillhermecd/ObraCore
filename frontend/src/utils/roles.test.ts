import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS, permissionsFor } from "./roles";

describe("permissionsFor", () => {
  it("MASTER pode tudo", () => {
    expect(permissionsFor("MASTER")).toEqual({
      canWrite: true,
      canInvite: true,
      canManageMembers: true,
      canEditGroup: true,
      canDeleteGroup: true,
      canViewFinanceiro: true,
    });
  });

  it("ADMIN escreve, convida e gerencia, mas não edita nem exclui a obra", () => {
    const perms = permissionsFor("ADMIN");
    expect(perms.canWrite).toBe(true);
    expect(perms.canInvite).toBe(true);
    expect(perms.canManageMembers).toBe(true);
    expect(perms.canEditGroup).toBe(false);
    expect(perms.canDeleteGroup).toBe(false);
    expect(perms.canViewFinanceiro).toBe(true);
  });

  it("FISCAL só lê: nenhuma permissão de escrita/gestão/financeiro", () => {
    const perms = permissionsFor("FISCAL");
    expect(perms.canWrite).toBe(false);
    expect(perms.canInvite).toBe(false);
    expect(perms.canManageMembers).toBe(false);
    expect(perms.canEditGroup).toBe(false);
    expect(perms.canDeleteGroup).toBe(false);
    expect(perms.canViewFinanceiro).toBe(false);
  });

  // Regra de segurança: enquanto o papel do usuário na obra ativa ainda não
  // carregou, é melhor negar tudo (FISCAL) do que liberar por engano e um
  // clique voltar 403 do backend.
  it("papel ausente (null/undefined) resolve para as permissões de FISCAL", () => {
    expect(permissionsFor(null)).toEqual(ROLE_PERMISSIONS.FISCAL);
    expect(permissionsFor(undefined)).toEqual(ROLE_PERMISSIONS.FISCAL);
  });
});

describe("ROLE_PERMISSIONS", () => {
  it("só MASTER pode editar ou excluir a obra", () => {
    expect(ROLE_PERMISSIONS.MASTER.canEditGroup).toBe(true);
    expect(ROLE_PERMISSIONS.MASTER.canDeleteGroup).toBe(true);
    expect(ROLE_PERMISSIONS.ADMIN.canEditGroup).toBe(false);
    expect(ROLE_PERMISSIONS.ADMIN.canDeleteGroup).toBe(false);
    expect(ROLE_PERMISSIONS.FISCAL.canEditGroup).toBe(false);
    expect(ROLE_PERMISSIONS.FISCAL.canDeleteGroup).toBe(false);
  });

  it("FISCAL é o único papel sem acesso ao financeiro", () => {
    expect(ROLE_PERMISSIONS.FISCAL.canViewFinanceiro).toBe(false);
    expect(ROLE_PERMISSIONS.ADMIN.canViewFinanceiro).toBe(true);
    expect(ROLE_PERMISSIONS.MASTER.canViewFinanceiro).toBe(true);
  });
});
