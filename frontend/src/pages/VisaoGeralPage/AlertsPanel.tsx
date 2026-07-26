import { NotificationOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Skeleton, theme } from "antd";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { DashboardAlert } from "../../api/modules/types";
import { usePrivacyFormat } from "../../privacyContext";

type AlertsPanelProps = {
  alerts: DashboardAlert[];
  loading: boolean;
  onViewDetails: (groupId: string) => void;
};

const badgeStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  width: 22,
  height: 22,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const rowStyle: CSSProperties = {
  display: "flex",
  gap: 11,
  padding: 13,
  borderRadius: 11,
  border: "1px solid",
};

const dotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  marginTop: 6,
  flexShrink: 0,
};

/**
 * Card "Obras em risco" do herói do Consolidado — metade direita da dupla
 * "estou lucrando? / alguma obra está em risco?". Alerta é sempre exceção:
 * só o que pede ação chega aqui. `nivel: 'warning'` (caixa/orçamento em
 * risco) recebe o ponto vermelho pulsante — é o mais urgente hoje; `'info'`
 * (ex.: obra sem orçamento definido) fica âmbar, estático.
 */
export function AlertsPanel({
  alerts,
  loading,
  onViewDetails,
}: AlertsPanelProps) {
  const { token } = theme.useToken();
  const { formatCurrency } = usePrivacyFormat();

  return (
    <Card style={{ height: "100%" }}>
      <style>{`@keyframes alertPulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <NotificationOutlined
            style={{ fontSize: 20, color: token.colorWarning }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: token.colorTextHeading,
            }}
          >
            Obras em risco
          </span>
        </div>
        {!loading && alerts.length > 0 && (
          <span
            style={{
              ...badgeStyle,
              color: token.colorBgContainer,
              background: token.colorWarning,
            }}
          >
            {alerts.length}
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} title={false} />
      ) : alerts.length === 0 ? (
        <Empty
          description="Nenhum alerta em aberto."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ margin: "12px 0" }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alerts.map((alert) => {
            const isCritico = alert.nivel === "warning";
            return (
              <div
                key={`${alert.groupId}-${alert.titulo}`}
                style={{
                  ...rowStyle,
                  background: isCritico
                    ? token.colorErrorBg
                    : token.colorWarningBg,
                  borderColor: isCritico
                    ? token.colorErrorBorder
                    : token.colorWarningBorder,
                }}
              >
                <span
                  style={{
                    ...dotStyle,
                    background: isCritico ? token.colorError : token.colorWarning,
                    animation: isCritico ? "alertPulse 2s infinite" : undefined,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 3,
                      color: token.colorText,
                    }}
                  >
                    {alert.projeto} — {alert.titulo}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: token.colorTextSecondary,
                      lineHeight: 1.4,
                    }}
                  >
                    {alert.mensagem}
                    {alert.valor !== null && (
                      <> Faltam {formatCurrency(alert.valor)}.</>
                    )}
                  </div>
                </div>
                <Button
                  size="small"
                  style={{ alignSelf: "center", flexShrink: 0 }}
                  onClick={() => onViewDetails(alert.groupId)}
                >
                  Ver
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 12 }}>
        <Link to="/status" style={{ fontSize: 12 }}>
          Ver todas as obras →
        </Link>
      </div>
    </Card>
  );
}
