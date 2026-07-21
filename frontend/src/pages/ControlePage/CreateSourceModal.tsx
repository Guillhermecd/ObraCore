import { Button, Form, Input, Modal, Tag, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { ExpenseSourceService } from "../../api/modules/ExpenseSourceService";
import type { ExpenseSource, ExpenseTipo } from "../../api/modules/types";

type CreateSourceForm = {
  name: string;
};

type Props = {
  open: boolean;
  tipo: ExpenseTipo;
  onClose: () => void;
  onCreated: (source: ExpenseSource) => void;
};

export function CreateSourceModal({ open, tipo, onClose, onCreated }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSourceForm>({
    defaultValues: { name: "" },
  });

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (values: CreateSourceForm) => {
    try {
      const response = await ExpenseSourceService.create({ ...values, tipo });
      messageApi.success("Fonte criada.");
      onCreated(response.source);
      close();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao criar fonte.",
      );
    }
  };

  return (
    <Modal
      title="Nova fonte"
      open={open}
      onCancel={close}
      footer={null}
      destroyOnHidden
    >
      {contextHolder}
      <Form layout="vertical" onFinish={handleSubmit(submit)}>
        <Form.Item label="Tipo">
          <Tag color={tipo === "ENTRADA" ? "success" : "default"}>
            {tipo === "ENTRADA" ? "Entrada" : "Saída"}
          </Tag>
        </Form.Item>
        <Controller
          name="name"
          control={control}
          rules={{ required: "Informe o nome da fonte." }}
          render={({ field }) => (
            <Form.Item
              label="Nome"
              validateStatus={errors.name ? "error" : undefined}
              help={errors.name?.message}
            >
              <Input
                {...field}
                autoFocus
                placeholder="Ex.: Conta corrente, Financiamento"
              />
            </Form.Item>
          )}
        />
        <Button type="primary" htmlType="submit" block loading={isSubmitting}>
          Criar fonte
        </Button>
      </Form>
    </Modal>
  );
}
