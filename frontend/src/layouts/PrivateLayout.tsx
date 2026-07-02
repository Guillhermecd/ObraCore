import {
  FormOutlined,
  LogoutOutlined,
  MenuOutlined,
  PieChartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Button,
  Drawer,
  Grid,
  Layout,
  Menu,
  Modal,
  type MenuProps,
} from "antd";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { authStorage } from "../api/modules/api";
import { bimdColors } from "../theme";
import {
  PrivateMobileHeaderContext,
  defaultPrivateMobileHeaderContent,
} from "./privateMobileHeader";

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

const headerStyle: CSSProperties = {
  height: 64,
  background: bimdColors.white,
  borderBottom: "1px solid #E5E7EB",
  display: "grid",
  gridTemplateColumns: "40px minmax(0, 1fr)",
  columnGap: 12,
  alignItems: "center",
  padding: "0 24px",
};

const mobileHeaderTitleStyle: CSSProperties = {
  fontWeight: 700,
  color: "#102A43",
  fontSize: 24,
  textAlign: "left",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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

export function PrivateLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.md);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [mobileHeaderContent, setMobileHeaderContent] = useState<ReactNode>(
    defaultPrivateMobileHeaderContent,
  );

  const logout = useCallback(() => {
    authStorage.clear();
    navigate("/login", { replace: true });
  }, [navigate]);

  const resetMobileHeaderContent = useCallback(() => {
    setMobileHeaderContent(defaultPrivateMobileHeaderContent);
  }, []);

  const confirmLogout = useCallback(() => {
    setLogoutModalOpen(false);
    logout();
  }, [logout]);

  const menuItems = useMemo<MenuProps["items"]>(
    () => [
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

  if (!authStorage.getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

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
            style={{ background: bimdColors.navy }}
          >
            <div style={collapsed ? collapsedLogoStyle : logoStyle}>
              <img
                src={
                  collapsed ? "/bimd-icon-light.png" : "/bimd-logo-light.png"
                }
                alt="BIMD"
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
          {!isDesktop && (
            <Header style={headerStyle}>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
              />
              <span style={mobileHeaderTitleStyle}>{mobileHeaderContent}</span>
            </Header>
          )}
          <Content style={{ padding: isDesktop ? 24 : 16 }}>
            <Outlet />
          </Content>
        </Layout>
        <Drawer
          title={
            <img
              style={drawerLogoStyle}
              src="/bimd-logo-light.png"
              alt="BIMD"
            />
          }
          placement="left"
          width="min(360px, 85vw)"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          closable={false}
          styles={{
            body: { padding: "12px 0", background: bimdColors.navy },
            header: {
              background: bimdColors.navy,
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
