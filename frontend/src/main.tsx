import ptBR from "antd/locale/pt_BR";
import { ConfigProvider } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { BrandingProvider } from "./branding/BrandingProvider";
import { useBranding } from "./branding/BrandingContext";
import { buildAppTheme, resolveBrandColors } from "./theme";
import { ThemeProvider, useTheme } from "./themeContext";

dayjs.locale("pt-br");

function AppContent() {
  const { themeMode } = useTheme();
  const branding = useBranding();
  const currentTheme = buildAppTheme(resolveBrandColors(branding), themeMode, branding?.key ?? null);

  return (
    <ConfigProvider theme={currentTheme} locale={ptBR}>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrandingProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </BrandingProvider>
  </StrictMode>,
);
