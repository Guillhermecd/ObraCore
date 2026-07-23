import type { CSSProperties } from "react";

/** Grade responsiva padrão para linhas de indicadores (ver `Kpi`). */
export const kpiGridStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
};
