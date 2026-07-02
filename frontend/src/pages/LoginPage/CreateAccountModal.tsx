import { Button, Form, Input, Modal, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { AuthService } from "../../api/modules/AuthService";

type CreateAccountForm = {
  email: string;
  emailConfirmation: string;
  password: string;
  passwordConfirmation: string;
  name?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CreateAccountModal({ open, onClose }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAccountForm>({
    defaultValues: {
      email: "",
      emailConfirmation: "",
      password: "",
      passwordConfirmation: "",
      name: "",
    },
  });

  const submit = async (values: CreateAccountForm) => {
    const response = await AuthService.register(values);
    messageApi.success(response.message);
    reset();
    onClose();
  };

  return (
    <Modal
      title="Criar conta"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      {contextHolder}
      <Form layout="vertical" onFinish={handleSubmit(submit)}>
        <Controller
          name="email"
          control={control}
          rules={{ required: "Informe o e-mail." }}
          render={({ field }) => (
            <Form.Item
              label="E-mail"
              validateStatus={errors.email ? "error" : undefined}
              help={errors.email?.message}
            >
              <Input {...field} type="email" autoComplete="email" />
            </Form.Item>
          )}
        />
        <Controller
          name="emailConfirmation"
          control={control}
          rules={{ required: "Confirme o e-mail." }}
          render={({ field }) => (
            <Form.Item
              label="Confirmação de e-mail"
              validateStatus={errors.emailConfirmation ? "error" : undefined}
              help={errors.emailConfirmation?.message}
            >
              <Input {...field} type="email" autoComplete="email" />
            </Form.Item>
          )}
        />
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Form.Item label="Nome">
              <Input {...field} autoComplete="name" />
            </Form.Item>
          )}
        />
        <Controller
          name="password"
          control={control}
          rules={{ required: "Informe a senha." }}
          render={({ field }) => (
            <Form.Item
              label="Senha"
              validateStatus={errors.password ? "error" : undefined}
              help={errors.password?.message}
            >
              <Input.Password {...field} autoComplete="new-password" />
            </Form.Item>
          )}
        />
        <Controller
          name="passwordConfirmation"
          control={control}
          rules={{ required: "Confirme a senha." }}
          render={({ field }) => (
            <Form.Item
              label="Confirmação de senha"
              validateStatus={errors.passwordConfirmation ? "error" : undefined}
              help={errors.passwordConfirmation?.message}
            >
              <Input.Password {...field} autoComplete="new-password" />
            </Form.Item>
          )}
        />
        <Button type="primary" htmlType="submit" block loading={isSubmitting}>
          Criar conta
        </Button>
      </Form>
    </Modal>
  );
}
