import { oaksdColors } from "../theme";
import type { ActiveBrand } from "./types";

/**
 * Registro client-side de marcas para teste local multi-host, sem
 * depender de seed no backend. Assets de logo/favicon servidos de
 * public/<Pasta>/ (Vite serve public/ na raiz `/`); mapeado a partir do
 * hostname por DEV_HOST_BRAND_KEYS em resolveTenantKey.ts.
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
    logoDarkUrl: "/OakSD/oak-logo-dark.svg",
    logoLightUrl: "/OakSD/oak-logo-light.svg",
    faviconUrl: "/OakSD/favicon-32x32.png",
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
    logoDarkUrl: "/CeP/CeP.jpg",
    logoLightUrl: "/CeP/CeP.jpg",
    faviconUrl: "/CeP/favicon.ico",
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
    logoDarkUrl: "/GHEngenharia/ghengenharia.png",
    logoLightUrl: "/GHEngenharia/ghengenharia.png",
    faviconUrl: "/GHEngenharia/ghengenharia-favicon-32.png",
    primaryColor: "#1A80C9",
    secondaryColor: "#3550A2",
    accentColor: "#07A2E4",
    gradientFrom: "#3D4297",
    gradientTo: "#01AEEE",
  },
};
