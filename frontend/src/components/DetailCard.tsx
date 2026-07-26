import { Card, Skeleton, theme } from "antd";
import type { CSSProperties, ReactNode } from "react";
import { HintLabel } from "./HintLabel";

/**
 * Uma célula do grid 2×2 de mini-stats de um `DetailCard`: rótulo + valor,
 * com cor e detalhe (ex.: margem) opcionais.
 */
export type DetailStat = {
  label: string;
  value: ReactNode;
  color?: string;
  detail?: ReactNode;
  /** Explicação de como o valor é calculado e de onde vem — vira ícone de interrogação com tooltip ao lado do rótulo. */
  hint?: string;
};

type DetailCardProps = {
  icon: ReactNode;
  title: string;
  sublabel: string;
  stats: DetailStat[];
  loading?: boolean;
  /** Mostrado no lugar do grid de stats quando não há dado (ex.: nenhuma obra ainda). */
  emptyMessage?: ReactNode;
  footnote?: ReactNode;
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  marginBottom: 18,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px 14px",
};

/**
 * Card compacto de detalhamento do Consolidado: ícone + título, sublabel
 * (escopo, ex. "Reconhecido no ano"), grid 2×2 de mini-stats. Substitui o
 * antigo `SectionBlock` + grid de `Kpi` — três desses lado a lado formam a
 * seção "Detalhamento" do redesenho.
 */
export function DetailCard({
  icon,
  title,
  sublabel,
  stats,
  loading = false,
  emptyMessage,
  footnote,
}: DetailCardProps) {
  const { token } = theme.useToken();

  return (
    <Card>
      <div style={headerStyle}>
        <span
          style={{
            fontSize: 19,
            color: token.colorTextSecondary,
            display: "flex",
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: token.colorTextHeading,
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: token.colorTextTertiary,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          marginBottom: 14,
        }}
      >
        {sublabel}
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} title={false} />
      ) : emptyMessage ? (
        <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
          {emptyMessage}
        </div>
      ) : (
        <div style={gridStyle}>
          {stats.map((stat) => (
            <div key={stat.label}>
              <div
                style={{
                  color: token.colorTextSecondary,
                  fontSize: 12,
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <HintLabel label={stat.label} hint={stat.hint} iconFontSize={11} />
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: stat.color ?? token.colorText,
                }}
              >
                {stat.value}
              </div>
              {stat.detail && (
                <div style={{ color: token.colorTextTertiary, fontSize: 11 }}>
                  {stat.detail}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {footnote && (
        <div
          style={{ marginTop: 12, fontSize: 12, color: token.colorTextSecondary }}
        >
          {footnote}
        </div>
      )}
    </Card>
  );
}
