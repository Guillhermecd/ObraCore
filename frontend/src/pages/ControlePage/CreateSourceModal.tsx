import { Button, Form, Input, Modal, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { ExpenseSourceService } from "../../api/modules/ExpenseSourceService";
import type { ExpenseSource } from "../../api/modules/types";
import { getErrorMessage } from "../../utils/errors";

type CreateSourceForm = {
  name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (source: ExpenseSource) => void;
};

export function CreateSourceModal({ open, onClose, onCreated }: Props) {
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
      const response = await ExpenseSourceService.create(values);
      messageApi.success("Fonte criada.");
      onCreated(response.source);
      close();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Erro ao criar fonte."));
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
