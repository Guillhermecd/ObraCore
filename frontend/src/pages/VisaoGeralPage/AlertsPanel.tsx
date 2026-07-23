import { Button, Alert as AntAlert, Skeleton, Space, theme } from "antd";
import type { DashboardAlert } from "../../api/modules/types";
import { usePrivacyFormat } from "../../privacyContext";

type AlertsPanelProps = {
  alerts: DashboardAlert[];
  loading: boolean;
  onViewDetails: (groupId: string) => void;
};

/**
 * Alertas são exceção: só o que precisa de atenção chega aqui (o backend já
 * não emite mais o nível "success"). Sem nenhuma exceção o painel some — não
 * ocupa um Card inteiro para dizer que está tudo bem.
 */
export function AlertsPanel({
  alerts,
  loading,
  onViewDetails,
}: AlertsPanelProps) {
  const { token } = theme.useToken();
  const { formatCurrency } = usePrivacyFormat();

  if (loading) {
    return (
      <div style={{ marginBottom: 24 }}>
        <Skeleton active paragraph={{ rows: 1 }} title={false} />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div
        style={{
          marginBottom: 24,
          fontSize: 13,
          color: token.colorTextSecondary,
        }}
      >
        Nenhum alerta em aberto.
      </div>
    );
  }

  return (
    <Space
      direction="vertical"
      style={{ width: "100%", marginBottom: 24 }}
      size={12}
    >
      {alerts.map((alert) => (
        <AntAlert
          key={`${alert.groupId}-${alert.titulo}`}
          type={alert.nivel}
          showIcon
          message={`${alert.projeto} — ${alert.titulo}`}
          description={
            alert.valor === null
              ? alert.mensagem
              : `${alert.mensagem} Faltam ${formatCurrency(alert.valor)}.`
          }
          action={
            <Button size="small" onClick={() => onViewDetails(alert.groupId)}>
              Ver obra
            </Button>
          }
        />
      ))}
    </Space>
  );
}
