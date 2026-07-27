import type { ActiveBrand } from "./types";

const DEFAULT_TITLE = "ObraCore · OAKSD";
const DEFAULT_FAVICON = "/OakSD/favicon-32x32.png";

/**
 * Efeitos colaterais de chrome do navegador (título da aba, favicon) que
 * não passam pelo ConfigProvider do Ant Design. `brand: null` aplica o
 * default. `titleSuffix` (só nas marcas locais de dev, ver brands.ts)
 * compõe o título como "Empresa · Suffix".
 */
function resolveTitle(brand: ActiveBrand | null): string {
  if (!brand) {
    return DEFAULT_TITLE;
  }
  return brand.titleSuffix ? `${brand.companyName} · ${brand.titleSuffix}` : brand.companyName;
}

export function applyBrandChrome(brand: ActiveBrand | null) {
  document.title = resolveTitle(brand);

  const faviconLink = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (faviconLink) {
    faviconLink.href = brand?.faviconUrl ?? DEFAULT_FAVICON;
  }
}
