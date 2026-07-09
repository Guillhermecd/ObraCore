import { CameraOutlined, EditOutlined, MailOutlined } from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Form,
  Grid,
  Input,
  Modal,
  Space,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
  theme,
  type UploadProps,
} from "antd";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { AuthService } from "../../api/modules/AuthService";
import { ProfileService } from "../../api/modules/ProfileService";
import { authStorage } from "../../api/modules/api";
import type { User } from "../../api/modules/types";
import { PageHeader } from "../../components/PageHeader";
import { usePrivateMobileHeader } from "../../layouts/privateMobileHeader";
import { getErrorMessage } from "../../utils/errors";

type NameForm = {
  name: string;
};

type EmailForm = {
  email: string;
  emailConfirmation: string;
};

type PasswordForm = {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
};

type ActiveModal = "name" | "email" | "password" | null;

const { Text, Paragraph } = Typography;

const profileAvatarStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 16,
};

const profileDataListStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};

const profileDataLastRowStyle: CSSProperties = {
  padding: "14px 0",
};

const profileDataLabelStyle: CSSProperties = {
  display: "block",
  marginBottom: 6,
};

const profileDataValueRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const profileInlineEditStyle: CSSProperties = {
  width: 24,
  height: 24,
  padding: 0,
};

export function ProfilePage() {
  const { token } = theme.useToken();

  const profileDataRowStyle: CSSProperties = {
    padding: "14px 0",
    borderBottom: `1px solid ${token.colorBorderSecondary || token.colorBorder}`,
  };

  const profileDataValueStyle: CSSProperties = {
    color: token.colorTextHeading,
    fontSize: 16,
    lineHeight: 1.4,
  };

  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.md);
  usePrivateMobileHeader("Perfil");
  const [messageApi, contextHolder] = message.useMessage();
  const [user, setUser] = useState<User | null>(authStorage.getUser());
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  const nameForm = useForm<NameForm>({
    defaultValues: { name: user?.name || "" },
  });
  const emailForm = useForm<EmailForm>({
    defaultValues: {
      email: user?.email || "",
      emailConfirmation: user?.email || "",
    },
  });
  const passwordForm = useForm<PasswordForm>({
    defaultValues: {
      currentPassword: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  const syncUser = useCallback(
    (nextUser: User) => {
      setUser(nextUser);
      const token = authStorage.getToken();
      if (token) {
        authStorage.setSession(token, nextUser);
      }
      nameForm.reset({ name: nextUser.name || "" });
      emailForm.reset({
        email: nextUser.email,
        emailConfirmation: nextUser.email,
      });
    },
    [emailForm, nameForm],
  );

  useEffect(() => {
    ProfileService.getProfile()
      .then((response) => syncUser(response.user))
      .catch((error: unknown) => {
        messageApi.error(getErrorMessage(error, "Erro ao carregar perfil."));
      })
      .finally(() => setLoading(false));
  }, [messageApi, syncUser]);

  const openNameModal = () => {
    nameForm.reset({ name: user?.name || "" });
    setActiveModal("name");
  };

  const openEmailModal = () => {
    emailForm.reset({
      email: user?.email || "",
      emailConfirmation: user?.email || "",
    });
    setActiveModal("email");
  };

  const openPasswordModal = () => {
    passwordForm.reset();
    setActiveModal("password");
  };

  const closeModal = () => {
    setActiveModal(null);
    nameForm.reset({ name: user?.name || "" });
    emailForm.reset({
      email: user?.email || "",
      emailConfirmation: user?.email || "",
    });
    passwordForm.reset();
  };

  const updateName = async (values: NameForm) => {
    const response = await ProfileService.updateProfile(values);
    syncUser(response.user);
    setActiveModal(null);
    messageApi.success("Perfil atualizado.");
  };

  const updateEmail = async (values: EmailForm) => {
    const response = await ProfileService.updateEmail(values);
    syncUser(response.user);
    setActiveModal(null);
    messageApi.success("E-mail atualizado. Valide o novo endereço.");
  };

  const changePassword = async (values: PasswordForm) => {
    const response = await ProfileService.changePassword(values);
    passwordForm.reset();
    setActiveModal(null);
    messageApi.success(response.message);
  };

  const resendVerification = async () => {
    setResendingVerification(true);
    try {
      const response = await AuthService.resendVerification({
        email: user?.email,
      });
      messageApi.success(response.message);
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Erro ao reenviar validação."));
    } finally {
      setResendingVerification(false);
    }
  };

  const uploadImage: NonNullable<UploadProps["customRequest"]> = async ({
    file,
    onSuccess,
    onError,
  }) => {
    try {
      const response = await ProfileService.uploadImage(file as File);
      syncUser(response.user);
      messageApi.success("Foto atualizada.");
      onSuccess?.(response);
    } catch (error) {
      onError?.(error as Error);
      messageApi.error(getErrorMessage(error, "Erro ao enviar foto."));
    }
  };

  const editButton = (label: string, onClick: () => void) => (
    <Tooltip title={label}>
      <Button
        type="text"
        aria-label={label}
        icon={<EditOutlined />}
        onClick={onClick}
        style={profileInlineEditStyle}
      />
    </Tooltip>
  );

  return (
    <section>
      {contextHolder}
      <PageHeader
        title="Perfil"
        description="Dados da conta, segurança e foto de perfil."
      />

      {user && !user.emailValidated && (
        <Alert
          type="warning"
          showIcon
          message="E-mail não validado"
          description="Valide seu e-mail para concluir a configuração da conta."
          action={
            <Button
              size="small"
              onClick={resendVerification}
              loading={resendingVerification}
            >
              Reenviar validação
            </Button>
          }
          style={{ marginBottom: 20 }}
        />
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "minmax(260px, 360px) 1fr" : "1fr",
          gap: 20,
        }}
      >
        <Card loading={loading}>
          <div style={profileAvatarStyle}>
            <Avatar
              size={120}
              src={user?.profileImage?.url}
              icon={<CameraOutlined />}
            />
            <div>
              <Space direction="vertical" align="center">
                <strong>{user?.name || "Sem nome"}</strong>
                <span>{user?.email}</span>
                <Tag color={user?.emailValidated ? "green" : "orange"}>
                  {user?.emailValidated
                    ? "E-mail validado"
                    : "E-mail não validado"}
                </Tag>
              </Space>
            </div>
            <Upload
              showUploadList={false}
              customRequest={uploadImage}
              accept="image/*"
            >
              <Button icon={<CameraOutlined />}>Alterar foto</Button>
            </Upload>
          </div>
        </Card>

        <Card title="Dados da conta" loading={loading}>
          <div style={profileDataListStyle}>
            <div style={profileDataRowStyle}>
              <div>
                <Text style={profileDataLabelStyle} type="secondary">
                  Nome
                </Text>
                <div style={profileDataValueRowStyle}>
                  <Text style={profileDataValueStyle}>
                    {user?.name || "Sem nome"}
                  </Text>
                  {editButton("Editar nome", openNameModal)}
                </div>
              </div>
            </div>

            <div style={profileDataRowStyle}>
              <div>
                <Text style={profileDataLabelStyle} type="secondary">
                  E-mail
                </Text>
                <div style={profileDataValueRowStyle}>
                  <Text style={profileDataValueStyle}>
                    {user?.email || "-"}
                  </Text>
                  {editButton("Alterar e-mail", openEmailModal)}
                  <Tag color={user?.emailValidated ? "green" : "orange"}>
                    {user?.emailValidated ? "Validado" : "Não validado"}
                  </Tag>
                </div>
                {user && !user.emailValidated && (
                  <Button
                    type="link"
                    size="small"
                    onClick={resendVerification}
                    loading={resendingVerification}
                    style={{ padding: 0 }}
                  >
                    Reenviar validação
                  </Button>
                )}
              </div>
            </div>

            <div style={profileDataLastRowStyle}>
              <div>
                <Text style={profileDataLabelStyle} type="secondary">
                  Senha
                </Text>
                <div style={profileDataValueRowStyle}>
                  <Text style={profileDataValueStyle}>••••••••</Text>
                  {editButton("Alterar senha", openPasswordModal)}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        title="Editar nome"
        open={activeModal === "name"}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
      >
        <Form layout="vertical" onFinish={nameForm.handleSubmit(updateName)}>
          <Controller
            name="name"
            control={nameForm.control}
            render={({ field }) => (
              <Form.Item label="Nome">
                <Input {...field} autoComplete="name" />
              </Form.Item>
            )}
          />
          <Button
            type="primary"
            htmlType="submit"
            loading={nameForm.formState.isSubmitting}
          >
            Salvar nome
          </Button>
        </Form>
      </Modal>

      <Modal
        title="Alterar e-mail"
        open={activeModal === "email"}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
      >
        <Paragraph type="secondary">
          Ao alterar o e-mail, enviaremos um novo link de validação para o
          endereço informado.
        </Paragraph>
        <Form layout="vertical" onFinish={emailForm.handleSubmit(updateEmail)}>
          <Controller
            name="email"
            control={emailForm.control}
            rules={{ required: "Informe o novo e-mail." }}
            render={({ field }) => (
              <Form.Item
                label="Novo e-mail"
                validateStatus={
                  emailForm.formState.errors.email ? "error" : undefined
                }
                help={emailForm.formState.errors.email?.message}
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
            name="emailConfirmation"
            control={emailForm.control}
            rules={{ required: "Confirme o novo e-mail." }}
            render={({ field }) => (
              <Form.Item
                label="Confirmação de e-mail"
                validateStatus={
                  emailForm.formState.errors.emailConfirmation
                    ? "error"
                    : undefined
                }
                help={emailForm.formState.errors.emailConfirmation?.message}
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
          <Button
            type="primary"
            htmlType="submit"
            loading={emailForm.formState.isSubmitting}
          >
            Alterar e-mail
          </Button>
        </Form>
      </Modal>

      <Modal
        title="Alterar senha"
        open={activeModal === "password"}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
      >
        <Form
          layout="vertical"
          onFinish={passwordForm.handleSubmit(changePassword)}
        >
          <Controller
            name="currentPassword"
            control={passwordForm.control}
            rules={{ required: "Informe a senha atual." }}
            render={({ field }) => (
              <Form.Item
                label="Senha atual"
                validateStatus={
                  passwordForm.formState.errors.currentPassword
                    ? "error"
                    : undefined
                }
                help={passwordForm.formState.errors.currentPassword?.message}
              >
                <Input.Password {...field} autoComplete="current-password" />
              </Form.Item>
            )}
          />
          <Controller
            name="password"
            control={passwordForm.control}
            rules={{ required: "Informe a nova senha." }}
            render={({ field }) => (
              <Form.Item
                label="Nova senha"
                validateStatus={
                  passwordForm.formState.errors.password ? "error" : undefined
                }
                help={passwordForm.formState.errors.password?.message}
              >
                <Input.Password {...field} autoComplete="new-password" />
              </Form.Item>
            )}
          />
          <Controller
            name="passwordConfirmation"
            control={passwordForm.control}
            rules={{ required: "Confirme a nova senha." }}
            render={({ field }) => (
              <Form.Item
                label="Confirmação de nova senha"
                validateStatus={
                  passwordForm.formState.errors.passwordConfirmation
                    ? "error"
                    : undefined
                }
                help={
                  passwordForm.formState.errors.passwordConfirmation?.message
                }
              >
                <Input.Password {...field} autoComplete="new-password" />
              </Form.Item>
            )}
          />
          <Button
            type="primary"
            htmlType="submit"
            loading={passwordForm.formState.isSubmitting}
          >
            Alterar senha
          </Button>
        </Form>
      </Modal>
    </section>
  );
}
