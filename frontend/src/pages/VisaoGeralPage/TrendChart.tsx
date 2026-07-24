import { Line } from "@ant-design/charts";
import { Card, Empty, Skeleton, theme } from "antd";
import { SectionBlock } from "../../components/SectionBlock";
import type { TrendPoint } from "../../api/modules/types";
import { usePrivacyFormat } from "../../privacyContext";

type TrendChartProps = {
  trend: TrendPoint[];
  loading: boolean;
};

const MESES_ABREV = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function monthLabel(mes: string) {
  const month = Number(mes.slice(5, 7));
  return MESES_ABREV[month - 1] ?? mes;
}

/**
 * Lucro reconhecido acumulado e caixa livre, mês a mês, últimos 12 meses.
 * Independe do seletor de período do Consolidado — é sempre a mesma janela
 * fixa (ver `DashboardService.computeTrend` no backend).
 */
export function TrendChart({ trend, loading }: TrendChartProps) {
  const { token } = theme.useToken();
  const { formatCurrency, formatCompactCurrency } = usePrivacyFormat();

  const serie = trend.flatMap((point) => [
    {
      mes: monthLabel(point.mes),
      serie: "Lucro reconhecido",
      valor: point.lucroReconhecidoAcumulado,
    },
    { mes: monthLabel(point.mes), serie: "Caixa livre", valor: point.caixaLivre },
  ]);

  const axisConfig = {
    x: {
      title: false,
      labelFill: token.colorText,
      labelFontSize: 12,
      labelFontWeight: 500,
    },
    y: {
      title: false,
      grid: { style: { stroke: token.colorBorder, lineWidth: 1 } },
      labelFill: token.colorText,
      labelFontSize: 12,
      labelFontWeight: 500,
      labelFormatter: formatCompactCurrency,
    },
  };

  return (
    <SectionBlock
      title="Tendência — 12 meses"
      scope="acumulado"
      footnote="Lucro reconhecido acumulado e caixa livre, mês a mês. Sempre os últimos 12 meses — não muda com o seletor de período."
    >
      <Card>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : trend.length === 0 ? (
          <Empty description="Sem dados suficientes para a tendência." />
        ) : (
          <div style={{ minHeight: 280 }}>
            <Line
              data={serie}
              xField="mes"
              yField="valor"
              colorField="serie"
              axis={axisConfig}
              scale={{
                color: {
                  domain: ["Lucro reconhecido", "Caixa livre"],
                  range: [token.colorSuccess, token.colorPrimary],
                },
              }}
              // Sem isto a legenda herda um cinza escuro do tema padrão do G2
              // e os rótulos das séries somem no fundo escuro.
              legend={{
                color: { itemLabelFill: token.colorText, itemLabelFontSize: 12 },
              }}
              tooltip={{ items: [{ field: "valor", valueFormatter: formatCurrency }] }}
              style={{ lineWidth: 2.5 }}
              point={{ shape: "circle", style: { r: 2.5 } }}
            />
          </div>
        )}
      </Card>
    </SectionBlock>
  );
}
