import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Liga o bind em 0.0.0.0 (não só localhost) de propósito: o teste
    // multi-brand local usa os IPs de rede/WSL que o Vite passa a expor
    // como "Network" (ver branding/resolveTenantKey.ts,
    // DEV_HOST_BRAND_KEYS). Acompanha CORS_ORIGINS no backend/.env, que
    // precisa listar cada origem usada — sem isso o browser bloqueia por
    // CORS mesmo com o servidor acessível.
    host: true,
  },
});
