import {
  AppstoreOutlined,
  BarChartOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FormOutlined,
  LogoutOutlined,
  MenuOutlined,
  PieChartOutlined,
  SunOutlined,
  MoonOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Drawer,
  Grid,
  Layout,
  Menu,
  Modal,
  theme,
  type MenuProps,
} from "antd";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { authStorage } from "../api/modules/api";
import { BrandLogo } from "../branding/BrandLogo";
import { useBranding } from "../branding/BrandingContext";
import { resolveBrandColors, resolveBrandDarkTheme } from "../theme";
import { useTheme } from "../themeContext";
import { usePrivacy } from "../privacyContext";
import { GroupProvider } from "./GroupProvider";
import { useActiveGroup } from "./groupContext";
import { PrivateMobileHeaderContext } from "./privateMobileHeader";

const { Header, Sider, Content } = Layout;

const layoutStyle: CSSProperties = {
  minHeight: "100vh",
};

const logoStyle: CSSProperties = {
  minHeight: 144,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 20px",
};

const collapsedLogoStyle: CSSProperties = {
  ...logoStyle,
  minHeight: 100,
  padding: "24px 8px",
};

const drawerLogoStyle: CSSProperties = {
  width: 160,
  height: "auto",
  display: "block",
  margin: "0 auto",
};

const menuWrapStyle: CSSProperties = {
  padding: "0 12px",
};

const collapsedMenuWrapStyle: CSSProperties = {
  padding: "0 4px",
};

const layoutControlsStyle: CSSProperties = {
  display: "flex",
  // Em linha para o olho ficar ao lado do tema; `wrap` deixa os dois
  // empilharem sozinhos quando a sidebar está recolhida e não cabem lado a lado.
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "0 8px 16px",
};

// Toggles de tema e de privacidade, reaproveitados tanto na sidebar (desktop)
// quanto no Drawer do menu (mobile). O seletor de obra saiu daqui — agora vive
// só na tela Obra, ao lado do título (não faz sentido na tela Consolidado).
function LayoutControls() {
  const { themeMode, toggleTheme } = useTheme();
  const { valuesHidden, toggleValues } = usePrivacy();
  const { token } = theme.useToken();

  return (
    <div style={layoutControlsStyle}>
      <Button
        type="text"
        icon={themeMode === "dark" ? <SunOutlined /> : <MoonOutlined />}
        onClick={toggleTheme}
        title={
          themeMode === "dark"
            ? "Mudar para tema claro"
            : "Mudar para tema escuro"
        }
        style={{ color: token.colorTextLightSolid }}
      />
      <Button
        type="text"
        icon={valuesHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
        onClick={toggleValues}
        title={valuesHidden ? "Mostrar valores" : "Esconder valores"}
        aria-pressed={valuesHidden}
        style={{ color: token.colorTextLightSolid }}
      />
    </div>
  );
}

function PrivateLayoutContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.md);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const branding = useBranding();
  const brandColors = resolveBrandColors(branding);
  const brandDarkTheme = resolveBrandDarkTheme(branding?.key ?? null);
  const brandName = branding?.companyName ?? "OAKSD";

  const [mobileHeaderContent, setMobileHeaderContent] =
    useState<ReactNode>(brandName);

  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const { error: groupsError, refreshGroups } = useActiveGroup();

  const currentHeaderStyle: CSSProperties = useMemo(
    () => ({
      height: 64,
      background: token.colorBgContainer,
      borderBottom: `1px solid ${token.colorBorderSecondary || token.colorBorder}`,
      display: "grid",
      gridTemplateColumns: "40px minmax(0, 1fr)",
      columnGap: 12,
      alignItems: "center",
      padding: "0 24px",
    }),
    [token],
  );

  const currentMobileHeaderTitleStyle: CSSProperties = useMemo(
    () => ({
      fontWeight: 700,
      color: token.colorTextHeading,
      fontSize: 24,
      textAlign: "left",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),
    [token],
  );

  const logout = useCallback(() => {
    authStorage.clear();
    navigate("/login", { replace: true });
  }, [navigate]);

  const resetMobileHeaderContent = useCallback(() => {
    setMobileHeaderContent(brandName);
  }, [brandName]);

  const confirmLogout = useCallback(() => {
    setLogoutModalOpen(false);
    logout();
  }, [logout]);

  const menuItems = useMemo<MenuProps["items"]>(
    () => [
      {
        key: "/consolidado",
        icon: <AppstoreOutlined />,
        label: "Dashboard",
        onClick: () => {
          setDrawerOpen(false);
          navigate("/consolidado");
        },
      },
      {
        key: "/status",
        icon: <BarChartOutlined />,
        label: "Status",
        onClick: () => {
          setDrawerOpen(false);
          navigate("/status");
        },
      },
      {
        key: "/obra",
        icon: <PieChartOutlined />,
        label: "Obra",
        onClick: () => {
          setDrawerOpen(false);
          navigate("/obra");
        },
      },
      {
        key: "/controle",
        icon: <FormOutlined />,
        label: "Controle",
        onClick: () => {
          setDrawerOpen(false);
          navigate("/controle");
        },
      },
      {
        key: "/grupos",
        icon: <TeamOutlined />,
        label: "Grupos",
        onClick: () => {
          setDrawerOpen(false);
          navigate("/grupos");
        },
      },
      {
        key: "/profile",
        icon: <UserOutlined />,
        label: "Perfil",
        onClick: () => {
          setDrawerOpen(false);
          navigate("/profile");
        },
      },
      {
        type: "divider",
      },
      {
        key: "logout",
        danger: true,
        icon: <LogoutOutlined />,
        label: "Sair",
        onClick: () => {
          setDrawerOpen(false);
          setLogoutModalOpen(true);
        },
      },
    ],
    [navigate],
  );

  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      style={{ borderInlineEnd: 0 }}
    />
  );

  const mobileHeaderContextValue = useMemo(
    () => ({
      setMobileHeaderContent,
      resetMobileHeaderContent,
    }),
    [resetMobileHeaderContent],
  );

  return (
    <PrivateMobileHeaderContext.Provider value={mobileHeaderContextValue}>
      <Layout style={layoutStyle}>
        {isDesktop && (
          <Sider
            width={264}
            collapsedWidth={72}
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            style={{
              background:
                themeMode === "dark"
                  ? brandDarkTheme.siderBg
                  : brandColors.secondary,
            }}
          >
            <div style={collapsed ? collapsedLogoStyle : logoStyle}>
              <BrandLogo
                tone="light"
                style={{
                  maxWidth: collapsed ? 52 : 420,
                  maxHeight: collapsed ? 60 : 120,
                  objectFit: "contain",
                }}
              />
            </div>
            <LayoutControls />
            <div style={collapsed ? collapsedMenuWrapStyle : menuWrapStyle}>
              {menu}
            </div>
          </Sider>
        )}
        <Layout>
          {!isDesktop && (
            <Header style={currentHeaderStyle}>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
              />
              <span style={currentMobileHeaderTitleStyle}>
                {mobileHeaderContent}
              </span>
            </Header>
          )}
          <Content style={{ padding: isDesktop ? 24 : 16 }}>
            {/* Um ponto só para a falha de carregamento das obras: sem ele,
                as telas mostram "nenhuma obra cadastrada" para um erro de
                rede. Fica acima do Outlet para valer em todas as páginas. */}
            {groupsError && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                message="Não foi possível carregar suas obras"
                description={groupsError}
                action={
                  <Button size="small" onClick={() => void refreshGroups()}>
                    Tentar de novo
                  </Button>
                }
              />
            )}
            <Outlet />
          </Content>
        </Layout>
        <Drawer
          title={<BrandLogo tone="light" style={drawerLogoStyle} />}
          placement="left"
          width="min(360px, 85vw)"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          closable={false}
          styles={{
            body: {
              padding: "12px 0",
              background:
                themeMode === "dark"
                  ? brandDarkTheme.siderBg
                  : brandColors.secondary,
            },
            header: {
              background:
                themeMode === "dark"
                  ? brandDarkTheme.siderBg
                  : brandColors.secondary,
              borderBottom: 0,
              padding: "24px 28px",
              textAlign: "center",
            },
          }}
        >
          <LayoutControls />
          <div style={menuWrapStyle}>{menu}</div>
        </Drawer>
        <Modal
          title="Sair da conta?"
          open={logoutModalOpen}
          onOk={confirmLogout}
          onCancel={() => setLogoutModalOpen(false)}
          okText="Sair"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
        >
          Você será desconectado e precisará entrar novamente para acessar o
          sistema.
        </Modal>
      </Layout>
    </PrivateMobileHeaderContext.Provider>
  );
}

export function PrivateLayout() {
  const location = useLocation();

  if (!authStorage.getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <GroupProvider>
      <PrivateLayoutContent />
    </GroupProvider>
  );
}
