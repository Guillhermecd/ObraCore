import type { AssignableGroupRole, GroupRole } from "../api/modules/types";

export const GROUP_ROLE_LABEL: Record<GroupRole, string> = {
  MASTER: "Dono",
  ADMIN: "Administrador",
  FISCAL: "Fiscal",
};

export const GROUP_ROLE_HINT: Record<GroupRole, string> = {
  MASTER: "Criou a obra. Pode tudo, inclusive editar e excluir a obra.",
  ADMIN: "Lança, edita, convida e gerencia colaboradores. Não edita a obra.",
  FISCAL: "Só acompanha. Não lança nada e não vê contrato, receita nem lucro.",
};

export const ASSIGNABLE_ROLE_OPTIONS: {
  value: AssignableGroupRole;
  label: string;
}[] = [
  { value: "FISCAL", label: GROUP_ROLE_LABEL.FISCAL },
  { value: "ADMIN", label: GROUP_ROLE_LABEL.ADMIN },
];

/**
 * Espelho da matriz de `PERMISSIONS` em `backend/api/services/GroupService.js`.
 * Serve só para não oferecer um botão que vai voltar 403 — a autoridade é do
 * backend, e toda rota de escrita revalida por conta própria.
 */
export const ROLE_PERMISSIONS: Record<
  GroupRole,
  {
    canWrite: boolean;
    canInvite: boolean;
    canManageMembers: boolean;
    canEditGroup: boolean;
    canDeleteGroup: boolean;
    canViewFinanceiro: boolean;
  }
> = {
  MASTER: {
    canWrite: true,
    canInvite: true,
    canManageMembers: true,
    canEditGroup: true,
    canDeleteGroup: true,
    canViewFinanceiro: true,
  },
  ADMIN: {
    canWrite: true,
    canInvite: true,
    canManageMembers: true,
    canEditGroup: false,
    canDeleteGroup: false,
    canViewFinanceiro: true,
  },
  FISCAL: {
    canWrite: false,
    canInvite: false,
    canManageMembers: false,
    canEditGroup: false,
    canDeleteGroup: false,
    canViewFinanceiro: false,
  },
};

/** Permissões de um papel específico — útil fora do contexto da obra ativa. */
export function permissionsFor(role: GroupRole | null | undefined) {
  return ROLE_PERMISSIONS[role ?? "FISCAL"];
}
