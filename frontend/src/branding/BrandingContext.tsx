import { createContext, useContext } from "react";
import type { ActiveBrand } from "./types";

/**
 * `null` é um valor válido e esperado: significa "sem tenant resolvido,
 * usar o default OAKSD da plataforma" — não "provider ausente". Por isso
 * não há um guard que lance erro fora do provider; BrandingProvider
 * sempre envolve o app (ver main.tsx).
 */
export const BrandingContext = createContext<ActiveBrand | null>(null);

export function useBranding(): ActiveBrand | null {
  return useContext(BrandingContext);
}
