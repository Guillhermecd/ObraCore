import type { Branding } from "../api/modules/types";

/**
 * Forma da marca ativa consumida pelo resto do app — um superset
 * estrutural do doc `Branding` do backend (mesmos nomes de campo de cor),
 * mais `key`/`titleSuffix` usados pelas marcas locais de dev (ver
 * brands.ts). Isso permite que `resolveBrandColors`, `BrandLogo` etc.
 * continuem lendo os mesmos campos independente da origem (fetch do
 * backend vs. registro client-side).
 */
export type ActiveBrand = {
  key: string;
  companyName: string;
  /** Só as marcas locais de dev (brands.ts) definem isto. */
  titleSuffix?: string;
  /** Variante para fundo claro (ex.: card de login). */
  logoDarkUrl: string | null;
  /** Variante para fundo escuro (ex.: sider/drawer navy). */
  logoLightUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gradientFrom: string | null;
  gradientTo: string | null;
};

/**
 * O doc `Branding` do backend só tem um `logoUrl` (asset único enviado pelo
 * tenant), diferente das marcas locais de dev que têm variantes dark/light
 * dedicadas (ver brands.ts). Mapeia o mesmo valor para os dois tons.
 */
export function toActiveBrand(branding: Branding): ActiveBrand {
  return {
    key: branding.key,
    companyName: branding.companyName,
    logoDarkUrl: branding.logoUrl,
    logoLightUrl: branding.logoUrl,
    faviconUrl: branding.faviconUrl,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor: branding.accentColor,
    gradientFrom: branding.gradientFrom,
    gradientTo: branding.gradientTo,
  };
}
