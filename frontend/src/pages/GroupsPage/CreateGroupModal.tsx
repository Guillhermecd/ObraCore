import { Button, Form, Input, InputNumber, Modal, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { GroupService } from "../../api/modules/GroupService";
import type { Group } from "../../api/modules/types";
import { getErrorMessage } from "../../utils/errors";

type CreateGroupForm = {
  name: string;
  description: string;
  plannedSpending: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (group: Group) => void;
};

export function CreateGroupModal({ open, onClose, onCreated }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupForm>({
    defaultValues: { name: "", description: "", plannedSpending: 0 },
  });

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (values: CreateGroupForm) => {
    try {
      const response = await GroupService.create({
        name: values.name,
        description: values.description.trim() || undefined,
        plannedSpending: values.plannedSpending,
      });
      messageApi.success("Grupo criado.");
      onCreated(response.group);
      close();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Erro ao criar grupo."));
    }
  };

  return (
    <Modal
      title="Novo grupo"
      open={open}
      onCancel={close}
      footer={null}
      destroyOnHidden
    >
      {contextHolder}
      <Form layout="vertical" onFinish={handleSubmit(submit)}>
        <Controller
          name="name"
          control={control}
          rules={{ required: "Informe o nome do grupo." }}
          render={({ field }) => (
            <Form.Item
              label="Nome"
              validateStatus={errors.name ? "error" : undefined}
              help={errors.name?.message}
            >
              <Input
                {...field}
                autoFocus
                placeholder="Ex.: Obra Jardim das Flores"
              />
            </Form.Item>
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Form.Item label="Descrição">
              <Input.TextArea {...field} rows={3} placeholder="Opcional" />
            </Form.Item>
          )}
        />
        <Controller
          name="plannedSpending"
          control={control}
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
        <Button type="primary" htmlType="submit" block loading={isSubmitting}>
          Criar grupo
        </Button>
      </Form>
    </Modal>
  );
}
