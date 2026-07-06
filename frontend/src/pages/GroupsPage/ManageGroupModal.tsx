import { DeleteOutlined, MailOutlined } from "@ant-design/icons";
import {
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { authStorage } from "../../api/modules/api";
import { GroupInviteService } from "../../api/modules/GroupInviteService";
import { GroupService } from "../../api/modules/GroupService";
import type { Group, GroupMember } from "../../api/modules/types";
import { useActiveGroup } from "../../layouts/groupContext";
import { formatCurrency } from "../../utils/format";

type EditGroupForm = {
  name: string;
  description: string;
  plannedSpending: number;
};

type InviteForm = {
  email: string;
};

type Props = {
  group: Group | null;
  onClose: () => void;
  onChanged: () => void;
};

const { Paragraph } = Typography;

export function ManageGroupModal({ group, onClose, onChanged }: Props) {
  const { refreshGroups } = useActiveGroup();
  const [messageApi, contextHolder] = message.useMessage();
  const currentUserId = authStorage.getUser()?.id;

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const editForm = useForm<EditGroupForm>({
    defaultValues: { name: "", description: "", plannedSpending: 0 },
  });
  const inviteForm = useForm<InviteForm>({ defaultValues: { email: "" } });

  useEffect(() => {
    if (!group) {
      return;
    }

    editForm.reset({
      name: group.name,
      description: group.description || "",
      plannedSpending: group.plannedSpending,
    });
    inviteForm.reset({ email: "" });

    GroupService.listMembers(group.id)
      .then((response) => setMembers(response.members))
      .catch((error: unknown) => {
        messageApi.error(
          error instanceof Error ? error.message : "Erro ao carregar membros.",
        );
      })
      .finally(() => setMembersLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);

  if (!group) {
    return null;
  }

  const saveGroup = async (values: EditGroupForm) => {
    try {
      await GroupService.update(group.id, {
        name: values.name,
        description: values.description.trim() || undefined,
        plannedSpending: values.plannedSpending,
      });
      messageApi.success("Grupo atualizado.");
      onChanged();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao atualizar grupo.",
      );
    }
  };

  const sendInvite = async (values: InviteForm) => {
    try {
      await GroupInviteService.send({ groupId: group.id, email: values.email });
      messageApi.success("Convite enviado.");
      inviteForm.reset({ email: "" });
      onChanged();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao enviar convite.",
      );
    }
  };

  const removeMember = async (member: GroupMember) => {
    try {
      await GroupService.removeMember(group.id, member.id);
      setMembers((current) => current.filter((item) => item.id !== member.id));
      messageApi.success("Colaborador removido.");
      onChanged();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao remover colaborador.",
      );
    }
  };

  const deleteGroup = async () => {
    setDeleting(true);
    try {
      await GroupService.remove(group.id);
      messageApi.success("Grupo excluído.");
      await refreshGroups();
      onChanged();
      onClose();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao excluir grupo.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      title={`Gerenciar grupo · ${group.isPersonal ? "Pessoal" : group.name}`}
      open={Boolean(group)}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={560}
    >
      {contextHolder}

      <Form layout="vertical" onFinish={editForm.handleSubmit(saveGroup)}>
        <Controller
          name="name"
          control={editForm.control}
          rules={{ required: "Informe o nome do grupo." }}
          render={({ field }) => (
            <Form.Item
              label="Nome"
              validateStatus={editForm.formState.errors.name ? "error" : undefined}
              help={editForm.formState.errors.name?.message}
            >
              <Input {...field} />
            </Form.Item>
          )}
        />
        <Controller
          name="description"
          control={editForm.control}
          render={({ field }) => (
            <Form.Item label="Descrição">
              <Input.TextArea {...field} rows={2} />
            </Form.Item>
          )}
        />
        <Controller
          name="plannedSpending"
          control={editForm.control}
          render={({ field }) => (
            <Form.Item label="Gasto planejado">
              <InputNumber
                {...field}
                onChange={(value) => field.onChange(value ?? 0)}
                style={{ width: "100%" }}
                min={0}
                step={0.01}
                precision={2}
                decimalSeparator=","
                prefix="R$"
              />
            </Form.Item>
          )}
        />
        <Button
          type="primary"
          htmlType="submit"
          loading={editForm.formState.isSubmitting}
        >
          Salvar alterações
        </Button>
      </Form>

      <Divider />

      <Typography.Title level={5}>Histórico do gasto planejado</Typography.Title>
      {group.plannedSpendingHistory.length === 0 ? (
        <Paragraph type="secondary">Nenhuma alteração registrada ainda.</Paragraph>
      ) : (
        <List
          size="small"
          dataSource={[...group.plannedSpendingHistory].reverse()}
          rowKey="changedAt"
          renderItem={(entry) => (
            <List.Item>
              <List.Item.Meta
                title={`${formatCurrency(entry.previousValue ?? 0)} → ${formatCurrency(entry.value)}`}
                description={`${dayjs(entry.changedAt).format("DD/MM/YYYY HH:mm")} · ${entry.changedByName || "Usuário"}`}
              />
            </List.Item>
          )}
        />
      )}

      <Divider />

      <Typography.Title level={5}>Colaboradores</Typography.Title>
      <List
        loading={membersLoading}
        dataSource={members}
        rowKey="id"
        renderItem={(member) => (
          <List.Item
            actions={
              member.id !== group.owner
                ? [
                    <Popconfirm
                      key="remove"
                      title="Remover colaborador?"
                      okText="Remover"
                      cancelText="Cancelar"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => removeMember(member)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]
                : []
            }
          >
            <List.Item.Meta
              title={
                <>
                  {member.name || member.email}{" "}
                  {member.id === group.owner && <Tag color="gold">Dono</Tag>}
                  {member.id === currentUserId && <Tag>Você</Tag>}
                </>
              }
              description={member.email}
            />
          </List.Item>
        )}
      />

      <Divider />

      <Typography.Title level={5}>Convidar colaborador</Typography.Title>
      <Paragraph type="secondary">
        Informe o e-mail de um usuário já cadastrado no sistema.
      </Paragraph>
      <Form layout="inline" onFinish={inviteForm.handleSubmit(sendInvite)}>
        <Controller
          name="email"
          control={inviteForm.control}
          rules={{ required: "Informe o e-mail." }}
          render={({ field }) => (
            <Form.Item
              style={{ flex: 1, minWidth: 220 }}
              validateStatus={
                inviteForm.formState.errors.email ? "error" : undefined
              }
              help={inviteForm.formState.errors.email?.message}
            >
              <Input
                {...field}
                prefix={<MailOutlined />}
                type="email"
                placeholder="email@exemplo.com"
              />
            </Form.Item>
          )}
        />
        <Button
          type="primary"
          htmlType="submit"
          loading={inviteForm.formState.isSubmitting}
        >
          Convidar
        </Button>
      </Form>

      {!group.isPersonal && (
        <>
          <Divider />
          <Popconfirm
            title="Excluir este grupo?"
            description="Todos os lançamentos, categorias e fontes do grupo serão apagados."
            okText="Excluir"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={deleteGroup}
          >
            <Button danger icon={<DeleteOutlined />} loading={deleting}>
              Excluir grupo
            </Button>
          </Popconfirm>
        </>
      )}
    </Modal>
  );
}
