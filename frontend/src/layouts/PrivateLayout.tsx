import {
  AppstoreOutlined,
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
  Button,
  Drawer,
  Grid,
  Layout,
  Menu,
  Modal,
  Select,
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
import { GroupProvider } from "./GroupProvider";
import { useActiveGroup } from "./groupContext";
import { PrivateMobileHeaderContext } from "./privateMobileHeader";

const { Header, Sider, Content } = Layout;

const layoutStyle: CSSProperties = {
  minHeight: "100vh",
};

const logoStyle: CSSProperties = {
  minHeight: 88,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 28px",
};

const collapsedLogoStyle: CSSProperties = {
  ...logoStyle,
  minHeight: 72,
  padding: "20px 12px",
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

function GroupSelect({ style }: Readonly<{ style?: CSSProperties }>) {
  const { groups, activeGroupId, setActiveGroupId, loading } = useActiveGroup();

  return (
    <Select
      value={activeGroupId ?? undefined}
      loading={loading}
      style={{ minWidth: 160, maxWidth: 240, ...style }}
      onChange={setActiveGroupId}
      popupMatchSelectWidth={false}
      options={groups.map((group) => ({
        value: group.id,
        label: group.isPersonal ? "Pessoal" : group.name,
      }))}
    />
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

  const [mobileHeaderContent, setMobileHeaderContent] = useState<ReactNode>(brandName);

  const { themeMode, toggleTheme } = useTheme();
  const { token } = theme.useToken();

  const currentHeaderStyle: CSSProperties = useMemo(() => ({
    height: 64,
    background: token.colorBgContainer,
    borderBottom: `1px solid ${token.colorBorderSecondary || token.colorBorder}`,
    display: isDesktop ? "flex" : "grid",
    gridTemplateColumns: isDesktop ? undefined : "40px minmax(0, 1fr) auto",
    columnGap: 12,
    alignItems: "center",
    justifyContent: isDesktop ? "flex-end" : undefined,
    padding: "0 24px",
  }), [isDesktop, token]);

  const currentMobileHeaderTitleStyle: CSSProperties = useMemo(() => ({
    fontWeight: 700,
    color: token.colorTextHeading,
    fontSize: 24,
    textAlign: "left",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }), [token]);

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
        key: "/visao-geral",
        icon: <AppstoreOutlined />,
        label: "Visão Geral",
        onClick: () => {
          setDrawerOpen(false);
          navigate("/visao-geral");
        },
      },
      {
        key: "/dashboard",
        icon: <PieChartOutlined />,
        label: "Dashboard",
        onClick: () => {
          setDrawerOpen(false);
          navigate("/dashboard");
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
              background: themeMode === "dark" ? brandDarkTheme.siderBg : brandColors.secondary,
            }}
          >
            <div style={collapsed ? collapsedLogoStyle : logoStyle}>
              <BrandLogo
                tone="light"
                style={{
                  maxWidth: collapsed ? 24 : 188,
                  maxHeight: collapsed ? 30 : 48,
                  objectFit: "contain",
                }}
              />
            </div>
            <div style={collapsed ? collapsedMenuWrapStyle : menuWrapStyle}>
              {menu}
            </div>
          </Sider>
        )}
        <Layout>
          <Header style={currentHeaderStyle}>
            {!isDesktop && (
              <>
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setDrawerOpen(true)}
                />
                <span style={currentMobileHeaderTitleStyle}>
                  {mobileHeaderContent}
                </span>
              </>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                justifyContent: "flex-end",
                width: isDesktop ? "auto" : "100%",
              }}
            >
              <Button
                type="text"
                icon={themeMode === "dark" ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggleTheme}
                title={themeMode === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
              />
              <GroupSelect style={isDesktop ? undefined : { flex: 1, minWidth: 120 }} />
            </div>
          </Header>
          <Content style={{ padding: isDesktop ? 24 : 16 }}>
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
              background: themeMode === "dark" ? brandDarkTheme.siderBg : brandColors.secondary,
            },
            header: {
              background: themeMode === "dark" ? brandDarkTheme.siderBg : brandColors.secondary,
              borderBottom: 0,
              padding: "24px 28px",
              textAlign: "center",
            },
          }}
        >
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
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return (
    <GroupProvider>
      <PrivateLayoutContent />
    </GroupProvider>
  );
}
