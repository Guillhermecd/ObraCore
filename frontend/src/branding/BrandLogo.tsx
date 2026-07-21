import type { CSSProperties } from "react";
import { useBranding } from "./BrandingContext";

const DEFAULT_COMPANY_NAME = "OAKSD";

const TONE_COLORS = {
  dark: "#102A43",
  light: "#FFFFFF",
} as const;

const wordmarkBaseStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: 20,
  lineHeight: 1.2,
  letterSpacing: 0.2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

type BrandLogoProps = {
  style?: CSSProperties;
  /**
   * Cor do wordmark de fallback (ver abaixo) quando não há `logoUrl`.
   * "dark" para fundos claros (ex.: card de login), "light" para fundos
   * escuros (ex.: sider/drawer navy). Sem efeito quando há uma <img> real.
   */
  tone?: keyof typeof TONE_COLORS;
};

/**
 * Logo é imagem, não CSS: um único asset por marca (branding.logoUrl),
 * dimensionado via `style` pelo chamador (login, sider expandido/
 * colapsado, drawer mobile). Sem doc de branding => logo default OAKSD.
 *
 * Enquanto os assets reais não chegam (Fase 4) — e para as marcas locais
 * de dev em brands.ts, que não têm PNG — `logoUrl: null` cai num
 * wordmark de texto com o nome da empresa, em vez de uma <img> quebrada.
 */
export function BrandLogo({ style, tone = "dark" }: Readonly<BrandLogoProps>) {
  const branding = useBranding();

  if (!branding?.logoUrl) {
    return (
      <span style={{ ...wordmarkBaseStyle, color: TONE_COLORS[tone], ...style }}>
        {branding?.companyName ?? DEFAULT_COMPANY_NAME}
      </span>
    );
  }

  return (
    <img src={branding.logoUrl} alt={branding.companyName} style={style} />
  );
}
