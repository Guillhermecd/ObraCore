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
 */
export function buildAppTheme(brand: BrandColors, mode: "light" | "dark"): ThemeConfig {
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
    return {
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: brand.primary,
        colorInfo: brand.accent,
        colorLink: brand.primary,
        colorText: "#ECF0F3",
        colorTextHeading: "#FFFFFF",
        colorTextSecondary: "#9CA3AF",
        colorBgBase: "#111827",
        colorBgLayout: "#1F2937",
        colorBorder: "#374151",
        ...shared,
      },
      components: {
        ...sharedComponents,
        Layout: {
          bodyBg: "#1F2937",
          headerBg: "#111827",
          siderBg: "#111827",
          triggerBg: "#111827",
        },
        Menu: {
          darkItemBg: "#111827",
          darkSubMenuItemBg: "#111827",
          darkItemSelectedBg: brand.primary,
          darkItemHoverBg: "#1F2937",
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
