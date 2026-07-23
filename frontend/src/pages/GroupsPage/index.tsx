import { PlusOutlined, SettingOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Grid,
  List,
  Popconfirm,
  Space,
  Tag,
  message,
  theme,
} from "antd";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { GroupInviteService } from "../../api/modules/GroupInviteService";
import type { ReceivedGroupInvite, SentGroupInvite } from "../../api/modules/types";
import { useActiveGroup } from "../../layouts/groupContext";
import { usePrivateMobileHeader } from "../../layouts/privateMobileHeader";
import { GROUP_ROLE_LABEL, permissionsFor } from "../../utils/roles";
import { CreateGroupModal } from "./CreateGroupModal";
import { ManageGroupModal } from "./ManageGroupModal";

const pageHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 20,
};

const invitesGridStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  marginTop: 16,
};

export function GroupsPage() {
  const { token } = theme.useToken();
  const pageTitleStyle: CSSProperties = {
    margin: 0,
    color: token.colorTextHeading,
    fontSize: 26,
  };

  const pageDescriptionStyle: CSSProperties = {
    margin: "4px 0 0",
    color: token.colorTextSecondary,
  };

  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.md);
  usePrivateMobileHeader("Grupos");
  const [messageApi, contextHolder] = message.useMessage();
  const { groups, activeGroupId, setActiveGroupId, refreshGroups } =
    useActiveGroup();

  const [sentInvites, setSentInvites] = useState<SentGroupInvite[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<ReceivedGroupInvite[]>(
    [],
  );
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [manageGroupId, setManageGroupId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const manageGroup =
    groups.find((group) => group.id === manageGroupId) || null;

  const loadInvites = () => {
    Promise.all([
      GroupInviteService.listSent(),
      GroupInviteService.listReceived(),
    ])
      .then(([sentResponse, receivedResponse]) => {
        setSentInvites(sentResponse.invites);
        setReceivedInvites(receivedResponse.invites);
      })
      .catch((error: unknown) => {
        messageApi.error(
          error instanceof Error ? error.message : "Erro ao carregar convites.",
        );
      })
      .finally(() => setInvitesLoading(false));
  };

  useEffect(loadInvites, [messageApi, refreshKey]);

  const refreshAll = () => {
    refreshGroups();
    setRefreshKey((key) => key + 1);
  };

  const acceptInvite = async (invite: ReceivedGroupInvite) => {
    try {
      await GroupInviteService.accept(invite.id);
      messageApi.success(`Você agora participa de "${invite.groupName}".`);
      refreshAll();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao aceitar convite.",
      );
    }
  };

  const declineInvite = async (invite: ReceivedGroupInvite) => {
    try {
      await GroupInviteService.decline(invite.id);
      messageApi.info("Convite recusado.");
      refreshAll();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao recusar convite.",
      );
    }
  };

  const cancelInvite = async (invite: SentGroupInvite) => {
    try {
      await GroupInviteService.cancel(invite.id);
      messageApi.info("Convite cancelado.");
      refreshAll();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao cancelar convite.",
      );
    }
  };

  return (
    <section>
      {contextHolder}
      <div style={pageHeaderRowStyle}>
        {isDesktop && (
          <div>
            <h1 style={pageTitleStyle}>Grupos</h1>
            <p style={pageDescriptionStyle}>
              Gerencie seus grupos e convites de colaboração.
            </p>
          </div>
        )}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          Novo grupo
        </Button>
      </div>

      <Card title="Meus grupos">
        <List
          dataSource={groups}
          rowKey="id"
          renderItem={(group) => {
            const actions = [];

            if (group.id !== activeGroupId) {
              actions.push(
                <Button
                  key="activate"
                  size="small"
                  onClick={() => setActiveGroupId(group.id)}
                >
                  Selecionar
                </Button>,
              );
            }

            // Admin também gerencia (colaboradores e convites); o que é só do
            // dono fica escondido dentro do modal.
            if (permissionsFor(group.myRole).canManageMembers) {
              actions.push(
                <Button
                  key="manage"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={() => setManageGroupId(group.id)}
                >
                  Gerenciar
                </Button>,
              );
            }

            return (
              <List.Item actions={actions}>
                <List.Item.Meta
                  title={
                    <Space wrap>
                      {group.isPersonal ? "Pessoal" : group.name}
                      {group.id === activeGroupId && (
                        <Tag color="blue">Ativo</Tag>
                      )}
                      <Tag color={group.myRole === "MASTER" ? "gold" : "default"}>
                        {GROUP_ROLE_LABEL[group.myRole]}
                      </Tag>
                    </Space>
                  }
                  description={
                    group.description
                      ? `${group.memberCount} membro(s) · ${group.description}`
                      : `${group.memberCount} membro(s)`
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>

      <div
        style={{
          ...invitesGridStyle,
          gridTemplateColumns: isDesktop ? "repeat(2, 1fr)" : "1fr",
        }}
      >
        <Card title="Convites enviados" loading={invitesLoading}>
          {sentInvites.length === 0 ? (
            <Empty description="Nenhum convite pendente." />
          ) : (
            <List
              dataSource={sentInvites}
              rowKey="id"
              renderItem={(invite) => (
                <List.Item
                  actions={[
                    <Popconfirm
                      key="cancel"
                      title="Cancelar convite?"
                      okText="Cancelar convite"
                      cancelText="Voltar"
                      onConfirm={() => cancelInvite(invite)}
                    >
                      <Button size="small" danger>
                        Cancelar
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={invite.groupName}
                    description={`${invite.inviteeEmail} · como ${GROUP_ROLE_LABEL[invite.role]}`}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card title="Convites recebidos (pendentes)" loading={invitesLoading}>
          {receivedInvites.length === 0 ? (
            <Empty description="Nenhum convite recebido." />
          ) : (
            <List
              dataSource={receivedInvites}
              rowKey="id"
              renderItem={(invite) => (
                <List.Item
                  actions={[
                    <Button
                      key="accept"
                      size="small"
                      type="primary"
                      onClick={() => acceptInvite(invite)}
                    >
                      Aceitar
                    </Button>,
                    <Button
                      key="decline"
                      size="small"
                      onClick={() => declineInvite(invite)}
                    >
                      Recusar
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={invite.groupName}
                    description={`Convidado por ${invite.inviterName} · como ${GROUP_ROLE_LABEL[invite.role]}`}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>

      <CreateGroupModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => refreshGroups()}
      />

      <ManageGroupModal
        group={manageGroup}
        onClose={() => setManageGroupId(null)}
        onChanged={refreshAll}
      />
    </section>
  );
}
