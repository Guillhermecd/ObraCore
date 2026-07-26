import { Spin } from "antd";
import type { CSSProperties } from "react";

// Splash neutro exibido enquanto o branding do tenant é resolvido, antes
// de sabermos a marca ativa — por isso não usa cores de marca nenhuma.
const splashStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#09090B",
};

export function BrandSplash() {
  return (
    <div style={splashStyle}>
      <Spin size="large" />
    </div>
  );
}
