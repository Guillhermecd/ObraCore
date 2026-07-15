/**
 * Fonte única de verdade da paleta de marca (ObraCore, verde).
 *
 * Consumida por:
 * - theme.ts (tokens do ConfigProvider / Ant Design)
 * - DashboardPage/index.tsx (gradientes dos gráficos AntV)
 * - dashboard.module.css (via `:root` — mesmos valores, replicados em CSS vars
 *   porque CSS Modules não importa constantes JS diretamente)
 *
 * Qualquer ajuste de cor da marca deve começar aqui.
 */
export const brandPrimary = "#82C022";
export const brandPrimaryHover = "#6BA018";
export const brandPrimaryPressed = "#5C8A15";
export const brandLight = "#B8D878";
export const brandNeutral = "#A6A6A6";

/** Texto sobre superfícies verdes (contraste AA — o verde é claro demais para texto branco). */
export const brandOnPrimary = "#1a1a1a";

export const brandGradient = `linear-gradient(135deg, ${brandLight} 0%, ${brandPrimary} 50%, ${brandPrimaryPressed} 100%)`;

/** Gradientes no formato de string do AntV (usados em `style={{ fill }}` dos gráficos). */
export const chartGradientH = `l(0) 0:${brandLight} 1:${brandPrimary}`;
export const chartGradientV = `l(90) 0:${brandLight} 1:${brandPrimary}`;
