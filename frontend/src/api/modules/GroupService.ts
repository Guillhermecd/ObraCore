import { api } from "./api";
import type {
  AssignableGroupRole,
  Group,
  GroupMember,
  MessageResponse,
  SituacaoObra,
  TipoObra,
} from "./types";

type CreateGroupPayload = {
  name: string;
  description?: string;
  plannedSpending?: number;
  tipoObra?: TipoObra;
  valorContrato?: number | null;
  situacao?: SituacaoObra;
  valorFechamento?: number | null;
};

type UpdateGroupPayload = Partial<CreateGroupPayload>;

type GroupListResponse = {
  groups: Group[];
  activeGroupId: string;
};

type GroupResponse = {
  group: Group;
};

type GroupMembersResponse = {
  members: GroupMember[];
};

export const GroupService = {
  list() {
    return api<GroupListResponse>("/groups");
  },
  create(payload: CreateGroupPayload) {
    return api<GroupResponse>("/groups", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: UpdateGroupPayload) {
    return api<GroupResponse>(`/groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  remove(id: string) {
    return api<MessageResponse>(`/groups/${id}`, {
      method: "DELETE",
    });
  },
  listMembers(id: string) {
    return api<GroupMembersResponse>(`/groups/${id}/members`);
  },
  updateMemberRole(id: string, userId: string, role: AssignableGroupRole) {
    return api<MessageResponse & { role: AssignableGroupRole }>(
      `/groups/${id}/members/${userId}`,
      { method: "PATCH", body: JSON.stringify({ role }) },
    );
  },
  removeMember(id: string, userId: string) {
    return api<MessageResponse>(`/groups/${id}/members/${userId}`, {
      method: "DELETE",
    });
  },
};
