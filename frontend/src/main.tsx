import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { BrandingProvider } from "./branding/BrandingProvider";
import { ThemeProvider } from "./themeProvider";
import { PrivacyProvider } from "./privacyProvider";

dayjs.locale("pt-br");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrandingProvider>
      <ThemeProvider>
        <PrivacyProvider>
          <App />
        </PrivacyProvider>
      </ThemeProvider>
    </BrandingProvider>
  </StrictMode>,
);
