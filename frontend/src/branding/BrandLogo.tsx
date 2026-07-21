import type { CSSProperties } from "react";
import { useBranding } from "./BrandingContext";

const DEFAULT_COMPANY_NAME = "OAKSD";

/** Default de plataforma (sem tenant resolvido) => logo OakSD por tom. */
const DEFAULT_LOGO_DARK = "/OakSD/oak-logo-dark.svg";
const DEFAULT_LOGO_LIGHT = "/OakSD/oak-logo-light.svg";

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
 * Logo é imagem, não CSS: até duas variantes por marca (dark/light,
 * branding.logoDarkUrl/logoLightUrl), escolhidas pela prop `tone` e
 * dimensionadas via `style` pelo chamador (login, sider expandido/
 * colapsado, drawer mobile).
 *
 * Sem doc de branding (tenant não resolvido) => default de plataforma é a
 * própria logo OakSD, também por tom. Só cai no wordmark de texto com o
 * nome da empresa se houver um tenant de backend sem asset para o tom
 * pedido (`logoDarkUrl`/`logoLightUrl` nulos).
 */
export function BrandLogo({ style, tone = "dark" }: Readonly<BrandLogoProps>) {
  const branding = useBranding();

  if (!branding) {
    const defaultSrc = tone === "light" ? DEFAULT_LOGO_LIGHT : DEFAULT_LOGO_DARK;
    return <img src={defaultSrc} alt={DEFAULT_COMPANY_NAME} style={style} />;
  }

  const logoSrc = tone === "light" ? branding.logoLightUrl : branding.logoDarkUrl;

  if (!logoSrc) {
    return (
      <span style={{ ...wordmarkBaseStyle, color: TONE_COLORS[tone], ...style }}>
        {branding.companyName}
      </span>
    );
  }

  return <img src={logoSrc} alt={branding.companyName} style={style} />;
}
