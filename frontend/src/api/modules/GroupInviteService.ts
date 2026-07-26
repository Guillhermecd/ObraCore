import { api } from "./api";
import type {
  AssignableGroupRole,
  MessageResponse,
  ReceivedGroupInvite,
  SentGroupInvite,
} from "./types";

type SendGroupInvitePayload = {
  groupId: string;
  email: string;
  role: AssignableGroupRole;
};

type SentInvitesResponse = {
  invites: SentGroupInvite[];
};

type ReceivedInvitesResponse = {
  invites: ReceivedGroupInvite[];
};

type SendInviteResponse = {
  invite: SentGroupInvite;
};

export const GroupInviteService = {
  send(payload: SendGroupInvitePayload) {
    return api<SendInviteResponse>("/group-invites", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listSent() {
    return api<SentInvitesResponse>("/group-invites/sent");
  },
  listReceived() {
    return api<ReceivedInvitesResponse>("/group-invites/received");
  },
  accept(id: string) {
    return api<MessageResponse>(`/group-invites/${id}/accept`, {
      method: "POST",
    });
  },
  decline(id: string) {
    return api<MessageResponse>(`/group-invites/${id}/decline`, {
      method: "POST",
    });
  },
  cancel(id: string) {
    return api<MessageResponse>(`/group-invites/${id}/cancel`, {
      method: "POST",
    });
  },
};
