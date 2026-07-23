import { QuestionCircleOutlined } from "@ant-design/icons";
import { Card, Skeleton, Tooltip, theme } from "antd";
import type { CSSProperties, ReactNode } from "react";

/**
 * Anatomia única de indicador em todas as telas: rótulo acima, valor abaixo,
 * detalhe opcional embaixo. Antes cada bloco montava o seu, e cards vizinhos
 * apareciam com hierarquias diferentes.
 *
 * `emphasis` dá ao indicador o mesmo peso visual de um número principal —
 * usado no caixa livre, que precisa ter destaque igual ao saldo total.
 */
type KpiProps = {
  label: string;
  value: ReactNode;
  loading?: boolean;
  color?: string;
  hint?: string;
  detail?: ReactNode;
  emphasis?: boolean;
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  marginBottom: 4,
  display: "flex",
  alignItems: "center",
  gap: 6,
};

export function Kpi({
  label,
  value,
  loading = false,
  color,
  hint,
  detail,
  emphasis = false,
}: KpiProps) {
  const { token } = theme.useToken();

  return (
    <Card>
      {loading ? (
        <Skeleton active paragraph={{ rows: 1 }} title={false} />
      ) : (
        <>
          <div style={{ ...labelStyle, color: token.colorTextSecondary }}>
            {label}
            {hint && (
              <Tooltip title={hint}>
                <QuestionCircleOutlined style={{ cursor: "help" }} />
              </Tooltip>
            )}
          </div>
          <div
            style={{
              fontSize: emphasis ? 28 : 22,
              fontWeight: emphasis ? 700 : 600,
              lineHeight: 1.2,
              color: color ?? token.colorText,
            }}
          >
            {value}
          </div>
          {detail && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: token.colorTextSecondary,
              }}
            >
              {detail}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
