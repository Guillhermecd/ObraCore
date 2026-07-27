import type { CSSProperties } from "react";

/** Grade responsiva padrão para linhas de indicadores (ver `Kpi`). */
export const kpiGridStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
};

/** Página cheia, cartão centralizado — usada pelas telas de auth fora do
 * layout privado (redefinir senha, validar e-mail). */
export const authPageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: "#F4F6F8",
};

export const authPanelStyle: CSSProperties = {
  width: "100%",
  maxWidth: 460,
};
