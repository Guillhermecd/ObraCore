import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Button, Card, Form, Grid, Input, message, theme } from "antd";
import type { CSSProperties } from "react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../api/modules/AuthService";
import { authStorage } from "../../api/modules/api";
import { BrandLogo } from "../../branding/BrandLogo";
import { useBranding } from "../../branding/BrandingContext";
import { hexToRgba, resolveBrandColors } from "../../theme";
import { CreateAccountModal } from "./CreateAccountModal";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

type LoginForm = {
  email: string;
  password: string;
};

const authPanelStyle: CSSProperties = {
  width: "100%",
  maxWidth: 440,
};

const authLogoWrapStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginBottom: 32,
};

const authLogoStyle: CSSProperties = {
  width: "min(240px, 100%)",
  height: "auto",
  display: "block",
};

const authActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexDirection: "column",
  gap: 4,
  marginTop: 20,
  textAlign: "center",
};

export function LoginPage() {
  const { token } = theme.useToken();
  const branding = useBranding();
  const brandColors = resolveBrandColors(branding);

  const authShellStyle: CSSProperties = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background: `linear-gradient(135deg, ${hexToRgba(brandColors.gradientFrom, 0.08)}, ${hexToRgba(brandColors.gradientTo, 0.08)}), ${token.colorBgLayout}`,
  };

  const authActionTextStyle: CSSProperties = {
    margin: 0,
    color: token.colorTextSecondary,
  };

  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const [messageApi, contextHolder] = message.useMessage();
  const [createOpen, setCreateOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ defaultValues: { email: "", password: "" } });

  const submit = async (values: LoginForm) => {
    try {
      const response = await AuthService.login(values);
      authStorage.setSession(response.token, response.user);
      navigate("/obra", { replace: true });
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao entrar.",
      );
    }
  };

  return (
    <main style={authShellStyle}>
      {contextHolder}
      <section style={authPanelStyle}>
        <Card styles={{ body: { padding: screens.md ? 40 : "32px 24px" } }}>
          <div style={authLogoWrapStyle}>
            <BrandLogo style={authLogoStyle} />
          </div>
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
                  <Input
                    {...field}
                    prefix={<MailOutlined />}
                    type="email"
                    autoComplete="email"
                  />
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
                  <Input.Password
                    {...field}
                    prefix={<LockOutlined />}
                    autoComplete="current-password"
                  />
                </Form.Item>
              )}
            />
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={isSubmitting}
            >
              Entrar
            </Button>
          </Form>
          <div style={authActionsStyle}>
            <p style={authActionTextStyle}>
              Não possui uma conta?{" "}
              <Button
                type="link"
                onClick={() => setCreateOpen(true)}
                style={{ height: "auto", padding: 0 }}
              >
                Registre-se
              </Button>
            </p>
            <Button
              type="link"
              onClick={() => setForgotOpen(true)}
              style={{ height: "auto", padding: 0, fontSize: 13 }}
            >
              Esqueci minha senha
            </Button>
          </div>
        </Card>
      </section>
      <CreateAccountModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
      />
    </main>
  );
}
