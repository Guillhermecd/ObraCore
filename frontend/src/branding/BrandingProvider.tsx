import { useEffect, useState, type ReactNode } from "react";
import { BrandingService } from "../api/modules/BrandingService";
import { applyBrandChrome } from "./applyBrandChrome";
import { BrandingContext } from "./BrandingContext";
import { BrandSplash } from "./BrandSplash";
import { LOCAL_BRANDS } from "./brands";
import { resolveTenantKey } from "./resolveTenantKey";
import { toActiveBrand, type ActiveBrand } from "./types";

/**
 * Resolve o branding do tenant pelo subdomínio/host antes de renderizar
 * qualquer tela (inclusive /login, para não piscar no default).
 *
 * Dois caminhos:
 * - Host de dev mapeado em brands.ts (LOCAL_BRANDS) => marca resolvida
 *   sincronamente, sem fetch, sem flicker de splash.
 * - Subdomínio real de produção => fetch em /api/public/branding; doc
 *   inexistente (null = default OAKSD) ou falha de rede também caem no
 *   default, nunca quebram o app. Segura o render atrás de BrandSplash
 *   até a resolução terminar.
 *
 * `tenantKey`/`localBrand`/`ready` nascem via lazy initializer (síncronos)
 * para não disparar setState direto dentro do efeito — só o fetch
 * assíncrono atualiza estado a partir daqui, dentro de callbacks de promise.
 */
export function BrandingProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [tenantKey] = useState(() => resolveTenantKey());
  const [localBrand] = useState<ActiveBrand | null>(() => (tenantKey ? (LOCAL_BRANDS[tenantKey] ?? null) : null));
  const [branding, setBranding] = useState<ActiveBrand | null>(localBrand);
  const [ready, setReady] = useState(() => !tenantKey || Boolean(localBrand));

  useEffect(() => {
    if (localBrand) {
      applyBrandChrome(localBrand);
      return;
    }

    if (!tenantKey) {
      applyBrandChrome(null);
      return;
    }

    let cancelled = false;

    BrandingService.get(tenantKey)
      .then((response) => {
        if (cancelled) return;
        const activeBrand = response.branding ? toActiveBrand(response.branding) : null;
        setBranding(activeBrand);
        applyBrandChrome(activeBrand);
      })
      .catch(() => {
        if (!cancelled) applyBrandChrome(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantKey, localBrand]);

  if (!ready) {
    return <BrandSplash />;
  }

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}
