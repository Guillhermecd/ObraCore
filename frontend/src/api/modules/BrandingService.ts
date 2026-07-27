import { api } from "./api";
import type { Branding } from "./types";

type BrandingResponse = {
  branding: Branding | null;
};

/**
 * Consulta o branding público de um tenant pela key resolvida do
 * subdomínio (ver branding/resolveTenantKey.ts). Chamado antes do login,
 * então `auth: false` evita anexar headers de sessão desnecessários.
 */
export const BrandingService = {
  get(tenantKey: string) {
    return api<BrandingResponse>(
      `/public/branding?tenant=${encodeURIComponent(tenantKey)}`,
      { auth: false },
    );
  },
};
