import { theme } from "antd";
import type { ThemeConfig } from "antd";
import type { ActiveBrand } from "./branding/types";

export type BrandColors = {
  primary: string;
  secondary: string;
  accent: string;
  gradientFrom: string;
  gradientTo: string;
};

/**
 * OAKSD — default da plataforma (laranja/preto). Não é um tenant: é o
 * fallback embutido usado sempre que resolveTenantKey() não encontra uma
 * key (apex, subdomínio desconhecido) ou o fetch de branding falha. Vem
 * do brand kit OAKSD fornecido; ajustar aqui se os tokens oficiais mudarem.
 */
export const oaksdColors: BrandColors = {
  primary: "#F97316",
  secondary: "#111111",
  accent: "#FB923C",
  gradientFrom: "#18181B",
  gradientTo: "#09090B",
};

/** branding null (sem tenant resolvido) => cores da OAKSD. */
export function resolveBrandColors(branding: ActiveBrand | null): BrandColors {
  if (!branding) {
    return oaksdColors;
  }

  return {
    primary: branding.primaryColor,
    secondary: branding.secondaryColor,
    accent: branding.accentColor,
    gradientFrom: branding.gradientFrom ?? oaksdColors.gradientFrom,
    gradientTo: branding.gradientTo ?? oaksdColors.gradientTo,
  };
}

/**
 * Paleta completa do tema escuro de uma marca. Independente de
 * `BrandColors` (paleta clara) de propósito: o dark theme não é derivado
 * da cor clara, é definido à parte — permite ajustar cada marca sem afetar
 * as outras nem o tema claro (ver BRAND_DARK_THEMES abaixo).
 */
export type BrandDarkTheme = {
  colorPrimary: string;
  colorAccent: string;
  colorText: string;
  colorTextHeading: string;
  colorTextSecondary: string;
  colorBgBase: string;
  colorBgLayout: string;
  colorBorder: string;
  siderBg: string;
  headerBg: string;
  bodyBg: string;
  menuSelectedBg: string;
  menuHoverBg: string;
};

/** OAKSD — default de plataforma / tenants de backend sem dark theme próprio. */
const DEFAULT_DARK_THEME: BrandDarkTheme = {
  colorPrimary: "#F97316",
  colorAccent: "#FB923C",
  colorText: "#ECF0F3",
  colorTextHeading: "#FFFFFF",
  colorTextSecondary: "#9CA3AF",
  colorBgBase: "#0A0A0A",
  colorBgLayout: "#171717",
  colorBorder: "#2A2A2A",
  siderBg: "#111111",
  headerBg: "#171717",
  bodyBg: "#171717",
  menuSelectedBg: "#F97316",
  menuHoverBg: "#7C2D12",
};

/**
 * PONTO ÚNICO DE EDIÇÃO do tema escuro de cada marca. Keyed por
 * `branding.key`/LOCAL_BRANDS key (ver frontend/src/branding/brands.ts).
 * Cada entrada é livre para ajustar independentemente das outras — não há
 * derivação automática a partir da cor clara.
 */
const BRAND_DARK_THEMES: Record<string, BrandDarkTheme> = {
  obracore: DEFAULT_DARK_THEME,
  cep: {
    colorPrimary: "#16A34A",
    colorAccent: "#4ADE80",
    colorText: "#E7F5EC",
    colorTextHeading: "#FFFFFF",
    colorTextSecondary: "#86B899",
    colorBgBase: "#0A1F14",
    colorBgLayout: "#0F2A1C",
    colorBorder: "#1E4632",
    siderBg: "#103D24",
    headerBg: "#0F2A1C",
    bodyBg: "#0F2A1C",
    menuSelectedBg: "#16A34A",
    menuHoverBg: "#14532D",
  },
  ghengenharia: {
    colorPrimary: "#1A80C9",
    colorAccent: "#07A2E4",
    colorText: "#E7EEF7",
    colorTextHeading: "#FFFFFF",
    colorTextSecondary: "#8DA3C4",
    colorBgBase: "#0B1220",
    colorBgLayout: "#111C33",
    colorBorder: "#24345C",
    siderBg: "#16234A",
    headerBg: "#111C33",
    bodyBg: "#111C33",
    menuSelectedBg: "#1A80C9",
    menuHoverBg: "#3550A2",
  },
};

/** key desconhecida/nula (tenant não resolvido) => dark theme da OAKSD. */
export function resolveBrandDarkTheme(brandKey: string | null): BrandDarkTheme {
  if (!brandKey) {
    return DEFAULT_DARK_THEME;
  }
  return BRAND_DARK_THEMES[brandKey] ?? DEFAULT_DARK_THEME;
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Escurece uma cor hex por `amount` (0-1). Usado para estados hover
 * derivados da cor primária da marca, sem depender de nenhuma marca fixa. */
function darkenHex(hex: string, amount: number): string {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized, 16);
  const r = Math.max(0, Math.round(((value >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((value >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((value & 255) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Gera o ThemeConfig do Ant Design a partir das cores da marca ativa.
 * Substitui os antigos objetos estáticos `bimdTheme`/`bimdDarkTheme` — a
 * marca agora é resolvida em runtime (branding do tenant, ou OAKSD como
 * default), não hardcoded no bundle.
 *
 * `brandKey` seleciona o dark theme individual em BRAND_DARK_THEMES (só
 * usado no branch `dark`); o branch `light` continua derivado de `brand`
 * (BrandColors), sem mudança de comportamento.
 */
export function buildAppTheme(
  brand: BrandColors,
  mode: "light" | "dark",
  brandKey: string | null = null,
): ThemeConfig {
  const shared = {
    borderRadius: 8,
    controlHeight: 40,
  };

  const sharedComponents = {
    Button: {
      borderRadius: 8,
      controlHeight: 40,
      fontWeight: 600,
      primaryShadow: "none",
    },
    Card: {
      borderRadiusLG: 8,
      paddingLG: 24,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Typography: {
      titleMarginBottom: 0,
      titleMarginTop: 0,
    },
  };

  if (mode === "dark") {
    const dark = resolveBrandDarkTheme(brandKey);
    return {
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: dark.colorPrimary,
        colorInfo: dark.colorAccent,
        colorLink: dark.colorPrimary,
        colorText: dark.colorText,
        colorTextHeading: dark.colorTextHeading,
        colorTextSecondary: dark.colorTextSecondary,
        colorBgBase: dark.colorBgBase,
        colorBgLayout: dark.colorBgLayout,
        colorBorder: dark.colorBorder,
        ...shared,
      },
      components: {
        ...sharedComponents,
        Layout: {
          bodyBg: dark.bodyBg,
          headerBg: dark.headerBg,
          siderBg: dark.siderBg,
          triggerBg: dark.siderBg,
        },
        Menu: {
          darkItemBg: dark.siderBg,
          darkSubMenuItemBg: dark.siderBg,
          darkItemSelectedBg: dark.menuSelectedBg,
          darkItemHoverBg: dark.menuHoverBg,
        },
      },
    };
  }

  return {
    algorithm: theme.defaultAlgorithm,
    token: {
      colorPrimary: brand.primary,
      colorInfo: brand.accent,
      colorLink: brand.primary,
      colorText: "#1F2933",
      colorTextHeading: "#102A43",
      colorTextSecondary: "#627D98",
      colorBgBase: "#FFFFFF",
      colorBgLayout: "#F4F6F8",
      colorBorder: "#E5E7EB",
      ...shared,
    },
    components: {
      ...sharedComponents,
      Layout: {
        bodyBg: "#F4F6F8",
        headerBg: "#FFFFFF",
        siderBg: brand.secondary,
        triggerBg: brand.secondary,
      },
      Menu: {
        darkItemBg: brand.secondary,
        darkSubMenuItemBg: brand.secondary,
        darkItemSelectedBg: brand.primary,
        darkItemHoverBg: darkenHex(brand.primary, 0.2),
      },
    },
  };
}
