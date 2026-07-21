import { oaksdColors } from "../theme";
import type { ActiveBrand } from "./types";

/**
 * Registro client-side de marcas para teste local multi-host, sem
 * depender de seed no backend nem de assets de logo (chegam nas Fases
 * 4/5 — até lá BrandLogo mostra o nome da empresa como texto). Mapeado a
 * partir do hostname por DEV_HOST_BRAND_KEYS em resolveTenantKey.ts.
 *
 * O caminho de produção (subdomínio real) não usa este registro — busca
 * o branding via GET /api/public/branding.
 *
 * `titleSuffix`: verde e azul aqui são placeholders escolhidos para o
 * teste visual ficar bem distinto; troque pelos hex oficiais quando a
 * marca "CeP" definir sua paleta.
 */
export const LOCAL_BRANDS: Record<string, ActiveBrand> = {
  obracore: {
    key: "obracore",
    companyName: "ObraCore",
    titleSuffix: "OAKSD",
    logoUrl: null,
    faviconUrl: null,
    primaryColor: oaksdColors.primary,
    secondaryColor: oaksdColors.secondary,
    accentColor: oaksdColors.accent,
    gradientFrom: oaksdColors.gradientFrom,
    gradientTo: oaksdColors.gradientTo,
  },
  cep: {
    key: "cep",
    companyName: "CeP",
    titleSuffix: "ObraCore",
    logoUrl: null,
    faviconUrl: null,
    primaryColor: "#16A34A",
    secondaryColor: "#14532D",
    accentColor: "#4ADE80",
    gradientFrom: "#052E16",
    gradientTo: "#166534",
  },
  ghengenharia: {
    key: "ghengenharia",
    companyName: "GHEngenharia",
    titleSuffix: "ObraCore",
    logoUrl: null,
    faviconUrl: null,
    primaryColor: "#1A80C9",
    secondaryColor: "#3550A2",
    accentColor: "#07A2E4",
    gradientFrom: "#3D4297",
    gradientTo: "#01AEEE",
  },
};
