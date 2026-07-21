const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN ?? "obracore.com.br";

/**
 * Hosts de dev mapeados diretamente a uma key de marca local (ver
 * brands.ts), para testar as 3 identidades sem depender de subdomínio
 * real. IPs de LAN/Wi-Fi ou de adaptador WSL/Docker Desktop mudam ao
 * reiniciar a máquina/rede — se o host mudar, atualizar aqui e o
 * CORS_ORIGINS do backend (backend/.env).
 */
const DEV_HOST_BRAND_KEYS: Record<string, string> = {
  localhost: "obracore",
  "192.168.1.14": "cep",
  "172.19.128.1": "ghengenharia",
};

/**
 * Resolve a key do tenant a partir do hostname atual.
 * - host em DEV_HOST_BRAND_KEYS => a key mapeada (teste local multi-brand)
 * - VITE_TENANT_KEY (dev, localhost/IP) => tem prioridade sobre o mapa acima
 * - apex (== BASE_DOMAIN) => null (landing neutra, default OAKSD)
 * - subdomínio (<key>.BASE_DOMAIN) => <key>
 * - hostname desconhecido/fora do domínio base => null (fallback seguro)
 */
export function resolveTenantKey(): string | null {
  const host = window.location.hostname;
  const isLocalOrIp = host === "localhost" || host.endsWith(".localhost") || /^[\d.]+$/.test(host);

  if (isLocalOrIp) {
    const envOverride = import.meta.env.VITE_TENANT_KEY;
    if (envOverride) {
      return envOverride;
    }
    return DEV_HOST_BRAND_KEYS[host] ?? null;
  }

  if (host === BASE_DOMAIN) {
    return null;
  }

  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    return host.slice(0, -(`.${BASE_DOMAIN}`.length));
  }

  return null;
}
