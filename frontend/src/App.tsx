import ptBR from "antd/locale/pt_BR";
import { ConfigProvider } from "antd";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useBranding } from "./branding/BrandingContext";
import { buildAppTheme, resolveBrandColors } from "./theme";
import { useTheme } from "./themeContext";

export function App() {
  const { themeMode } = useTheme();
  const branding = useBranding();
  const currentTheme = buildAppTheme(resolveBrandColors(branding), themeMode, branding?.key ?? null);

  return (
    <ConfigProvider theme={currentTheme} locale={ptBR}>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}
