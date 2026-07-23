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
  Select,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { authStorage } from "../../api/modules/api";
import { GroupInviteService } from "../../api/modules/GroupInviteService";
import { GroupService } from "../../api/modules/GroupService";
import type {
  AssignableGroupRole,
  Group,
  GroupMember,
  SituacaoObra,
  TipoObra,
} from "../../api/modules/types";
import { useActiveGroup } from "../../layouts/groupContext";
import { usePrivacyFormat } from "../../privacyContext";
import { SITUACAO_OBRA_LABEL, TIPO_OBRA_LABEL } from "../../utils/obra";
import {
  ASSIGNABLE_ROLE_OPTIONS,
  GROUP_ROLE_HINT,
  GROUP_ROLE_LABEL,
  permissionsFor,
} from "../../utils/roles";

type EditGroupForm = {
  name: string;
  description: string;
  plannedSpending: number;
  tipoObra: TipoObra;
  valorContrato: number | null;
  situacao: SituacaoObra;
  valorFechamento: number | null;
};

type InviteForm = {
  email: string;
  role: AssignableGroupRole;
};

type Props = {
  group: Group | null;
  onClose: () => void;
  onChanged: () => void;
};

const { Paragraph } = Typography;

export function ManageGroupModal({ group, onClose, onChanged }: Props) {
  const { refreshGroups } = useActiveGroup();
  const { formatCurrency } = usePrivacyFormat();
  const [messageApi, contextHolder] = message.useMessage();
  const currentUserId = authStorage.getUser()?.id;

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const editForm = useForm<EditGroupForm>({
    defaultValues: {
      name: "",
      description: "",
      plannedSpending: 0,
      tipoObra: "PROPRIA",
      valorContrato: null,
      situacao: "EM_ANDAMENTO",
      valorFechamento: null,
    },
  });
  const editTipoObra = useWatch({ control: editForm.control, name: "tipoObra" });
  const editSituacao = useWatch({ control: editForm.control, name: "situacao" });
  const editValorContrato = useWatch({ control: editForm.control, name: "valorContrato" });
  const isConcluindo = editSituacao === "CONCLUIDO" && group?.situacao !== "CONCLUIDO";
  const inviteForm = useForm<InviteForm>({
    defaultValues: { email: "", role: "FISCAL" },
  });

  // Papel de quem está operando o modal. Admin chega até aqui para cuidar de
  // colaboradores, mas não vê o formulário da obra nem a exclusão.
  const myRole = group?.myRole ?? "FISCAL";
  const isMaster = myRole === "MASTER";
  const { canInvite, canManageMembers, canEditGroup, canDeleteGroup } =
    permissionsFor(myRole);
  // Só o dono cria outro administrador — um admin não pode criar um par que
  // depois não conseguiria rebaixar. Mesma regra do backend.
  const roleOptions = isMaster
    ? ASSIGNABLE_ROLE_OPTIONS
    : ASSIGNABLE_ROLE_OPTIONS.filter((option) => option.value === "FISCAL");

  useEffect(() => {
    if (!group) {
      return;
    }

    editForm.reset({
      name: group.name,
      description: group.description || "",
      plannedSpending: group.plannedSpending,
      tipoObra: group.tipoObra,
      valorContrato: group.valorContrato,
      situacao: group.situacao,
      // Sugere o valor do contrato como valor de fechamento na primeira vez
      // que a obra de cliente é concluída; se já tem valorFechamento gravado
      // (obra reaberta), respeita o que já foi informado.
      valorFechamento: group.valorFechamento ?? group.valorContrato,
    });
    inviteForm.reset({ email: "", role: "FISCAL" });

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
        tipoObra: values.tipoObra,
        valorContrato: values.tipoObra === "CLIENTE" ? values.valorContrato : null,
        situacao: values.situacao,
        // O backend só aceita valorFechamento junto de situacao CONCLUIDO —
        // fora disso o valor gravado é preservado (não zera ao reabrir).
        ...(values.situacao === "CONCLUIDO"
          ? { valorFechamento: values.valorFechamento }
          : {}),
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
      await GroupInviteService.send({
        groupId: group.id,
        email: values.email,
        role: values.role,
      });
      messageApi.success("Convite enviado.");
      inviteForm.reset({ email: "", role: "FISCAL" });
      onChanged();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao enviar convite.",
      );
    }
  };

  const changeMemberRole = async (
    member: GroupMember,
    role: AssignableGroupRole,
  ) => {
    const previousRole = member.role;
    // Otimista: o Select já reflete a escolha e volta atrás se a API recusar.
    setMembers((current) =>
      current.map((item) => (item.id === member.id ? { ...item, role } : item)),
    );

    try {
      await GroupService.updateMemberRole(group.id, member.id, role);
      messageApi.success(`${member.name || member.email} agora é ${GROUP_ROLE_LABEL[role]}.`);
    } catch (error) {
      setMembers((current) =>
        current.map((item) =>
          item.id === member.id ? { ...item, role: previousRole } : item,
        ),
      );
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao alterar o papel.",
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

      {!canEditGroup && (
        <Paragraph type="secondary">
          Como {GROUP_ROLE_LABEL[myRole].toLowerCase()}, você gerencia os
          colaboradores desta obra. Alterar orçamento, tipo de obra e contrato é
          exclusivo do dono.
        </Paragraph>
      )}

      {canEditGroup && (
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
          name="tipoObra"
          control={editForm.control}
          render={({ field }) => (
            <Form.Item
              label="Tipo de obra"
              help="Só obra de cliente compõe o resultado (receita e lucro reconhecidos) do Consolidado."
            >
              <Select
                {...field}
                options={[
                  { value: "PROPRIA", label: TIPO_OBRA_LABEL.PROPRIA },
                  { value: "CLIENTE", label: TIPO_OBRA_LABEL.CLIENTE },
                ]}
              />
            </Form.Item>
          )}
        />
        {editTipoObra === "CLIENTE" && (
          <Controller
            name="valorContrato"
            control={editForm.control}
            render={({ field }) => (
              <Form.Item label="Valor do contrato">
                <InputNumber
                  {...field}
                  value={field.value ?? undefined}
                  onChange={(value) => field.onChange(value ?? null)}
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                  precision={2}
                  decimalSeparator=","
                  prefix="R$"
                  placeholder="Pode ser informado depois"
                />
              </Form.Item>
            )}
          />
        )}
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
        <Controller
          name="situacao"
          control={editForm.control}
          render={({ field }) => (
            <Form.Item
              label="Situação"
              help="Concluída trava novos lançamentos e edição de despesas — entende-se que a obra terminou. Para corrigir algo depois, reabra a obra."
            >
              <Select
                {...field}
                options={[
                  { value: "PLANEJADO", label: SITUACAO_OBRA_LABEL.PLANEJADO },
                  { value: "EM_ANDAMENTO", label: SITUACAO_OBRA_LABEL.EM_ANDAMENTO },
                  { value: "CONCLUIDO", label: SITUACAO_OBRA_LABEL.CONCLUIDO },
                ]}
              />
            </Form.Item>
          )}
        />
        {editSituacao === "CONCLUIDO" && (
          <Controller
            name="valorFechamento"
            control={editForm.control}
            render={({ field }) => (
              <Form.Item
                label="Valor de fechamento"
                help="Valor pelo qual a obra foi entregue/vendida. O lucro exibido no Consolidado é esse valor menos o custo gasto."
              >
                <InputNumber
                  {...field}
                  value={field.value ?? undefined}
                  onChange={(value) => field.onChange(value ?? null)}
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                  precision={2}
                  decimalSeparator=","
                  prefix="R$"
                  addonAfter={
                    editValorContrato != null ? (
                      <Button
                        type="link"
                        size="small"
                        style={{ padding: 0 }}
                        onClick={() =>
                          editForm.setValue("valorFechamento", editValorContrato)
                        }
                      >
                        Usar valor do contrato
                      </Button>
                    ) : undefined
                  }
                />
              </Form.Item>
            )}
          />
        )}
        {isConcluindo ? (
          <Popconfirm
            title="Concluir esta obra?"
            description="Lançamentos pendentes (sem data realizada) não entram no custo do lucro. Depois de concluída, novos lançamentos ficam bloqueados até reabrir."
            okText="Concluir"
            cancelText="Cancelar"
            onConfirm={editForm.handleSubmit(saveGroup)}
          >
            <Button type="primary" loading={editForm.formState.isSubmitting}>
              Salvar alterações
            </Button>
          </Popconfirm>
        ) : (
          <Button
            type="primary"
            htmlType="submit"
            loading={editForm.formState.isSubmitting}
          >
            Salvar alterações
          </Button>
        )}
      </Form>
      )}

      {canEditGroup && (
      <>
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
      </>
      )}

      <Divider />

      <Typography.Title level={5}>Colaboradores</Typography.Title>
      <List
        loading={membersLoading}
        dataSource={members}
        rowKey="id"
        renderItem={(member) => {
          // Dono nunca é alterável; e um admin não mexe em outro admin —
          // sem isso dois admins podem se rebaixar mutuamente. O backend
          // aplica a mesma trava, aqui é só para não oferecer o que dá 403.
          const isTargetOwner = member.id === group.owner;
          const canActOnMember =
            canManageMembers &&
            !isTargetOwner &&
            (isMaster || member.role === "FISCAL");

          return (
            <List.Item
              actions={
                canActOnMember
                  ? [
                      <Select<AssignableGroupRole>
                        key="role"
                        size="small"
                        style={{ width: 150 }}
                        value={member.role as AssignableGroupRole}
                        onChange={(role) => changeMemberRole(member, role)}
                        options={roleOptions}
                      />,
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
                    <Tag color={isTargetOwner ? "gold" : "default"}>
                      {GROUP_ROLE_LABEL[member.role]}
                    </Tag>
                    {member.id === currentUserId && <Tag>Você</Tag>}
                  </>
                }
                description={
                  <>
                    {member.email}
                    <br />
                    <span style={{ fontSize: 12 }}>
                      {GROUP_ROLE_HINT[member.role]}
                    </span>
                  </>
                }
              />
            </List.Item>
          );
        }}
      />

      {canInvite && (
        <>
          <Divider />

          <Typography.Title level={5}>Convidar colaborador</Typography.Title>
          <Paragraph type="secondary">
            Informe o e-mail de um usuário já cadastrado no sistema e o papel com
            que ele entra.
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
            <Controller
              name="role"
              control={inviteForm.control}
              render={({ field }) => (
                <Form.Item>
                  <Select
                    {...field}
                    style={{ width: 150 }}
                    options={roleOptions}
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
        </>
      )}

      {canDeleteGroup && !group.isPersonal && (
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
