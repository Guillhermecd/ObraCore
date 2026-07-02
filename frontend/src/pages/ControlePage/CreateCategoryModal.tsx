import { Button, ColorPicker, Form, Input, Modal, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { ExpenseCategoryService } from "../../api/modules/ExpenseCategoryService";
import type { ExpenseCategory } from "../../api/modules/types";

type CreateCategoryForm = {
  name: string;
  color: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (category: ExpenseCategory) => void;
};

export function CreateCategoryModal({ open, onClose, onCreated }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryForm>({
    defaultValues: { name: "", color: "#0050FF" },
  });

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (values: CreateCategoryForm) => {
    try {
      const response = await ExpenseCategoryService.create(values);
      messageApi.success("Categoria criada.");
      onCreated(response.category);
      close();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao criar categoria.",
      );
    }
  };

  return (
    <Modal
      title="Nova categoria"
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
          rules={{ required: "Informe o nome da categoria." }}
          render={({ field }) => (
            <Form.Item
              label="Nome"
              validateStatus={errors.name ? "error" : undefined}
              help={errors.name?.message}
            >
              <Input
                {...field}
                autoFocus
                placeholder="Ex.: Material elétrico"
              />
            </Form.Item>
          )}
        />
        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <Form.Item label="Cor">
              <ColorPicker
                value={field.value}
                onChange={(color) => field.onChange(color.toHexString())}
              />
            </Form.Item>
          )}
        />
        <Button type="primary" htmlType="submit" block loading={isSubmitting}>
          Criar categoria
        </Button>
      </Form>
    </Modal>
  );
}
