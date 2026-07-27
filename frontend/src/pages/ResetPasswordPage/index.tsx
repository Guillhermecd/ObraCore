import { Button, Card, Form, Input, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { AuthService } from "../../api/modules/AuthService";
import { authPageStyle, authPanelStyle } from "../../components/layout";

type ResetPasswordForm = {
  password: string;
  passwordConfirmation: string;
};

export function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    defaultValues: { password: "", passwordConfirmation: "" },
  });

  const submit = async (values: ResetPasswordForm) => {
    const response = await AuthService.resetPassword({ token, ...values });
    messageApi.success(response.message);
    setTimeout(() => navigate("/login", { replace: true }), 600);
  };

  return (
    <main style={authPageStyle}>
      {contextHolder}
      <Card style={authPanelStyle} title="Redefinir senha">
        <Form layout="vertical" onFinish={handleSubmit(submit)}>
          <Controller
            name="password"
            control={control}
            rules={{ required: "Informe a nova senha." }}
            render={({ field }) => (
              <Form.Item
                label="Nova senha"
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
            rules={{ required: "Confirme a nova senha." }}
            render={({ field }) => (
              <Form.Item
                label="Confirmação de nova senha"
                validateStatus={
                  errors.passwordConfirmation ? "error" : undefined
                }
                help={errors.passwordConfirmation?.message}
              >
                <Input.Password {...field} autoComplete="new-password" />
              </Form.Item>
            )}
          />
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            Redefinir senha
          </Button>
        </Form>
      </Card>
    </main>
  );
}
