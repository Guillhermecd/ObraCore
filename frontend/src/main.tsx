import ptBR from "antd/locale/pt_BR";
import { ConfigProvider } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { bimdTheme } from "./theme";

dayjs.locale("pt-br");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider theme={bimdTheme} locale={ptBR}>
      <RouterProvider router={router} />
    </ConfigProvider>
  </StrictMode>,
);
