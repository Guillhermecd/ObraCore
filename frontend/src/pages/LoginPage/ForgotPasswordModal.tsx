import { Button, Form, Input, Modal, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { AuthService } from "../../api/modules/AuthService";

type ForgotPasswordForm = {
  email: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ForgotPasswordModal({ open, onClose }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({ defaultValues: { email: "" } });

  const submit = async (values: ForgotPasswordForm) => {
    const response = await AuthService.forgotPassword(values);
    messageApi.success(response.message);
    reset();
    onClose();
  };

  return (
    <Modal
      title="Esqueci minha senha"
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
        <Button type="primary" htmlType="submit" block loading={isSubmitting}>
          Enviar link
        </Button>
      </Form>
    </Modal>
  );
}
