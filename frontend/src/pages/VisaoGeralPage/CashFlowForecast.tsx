import { Column } from "@ant-design/charts";
import { Card, Col, Empty, Row, Skeleton, theme } from "antd";
import { Kpi } from "../../components/Kpi";
import { SectionBlock } from "../../components/SectionBlock";
import type { CashflowForecastResponse } from "../../api/modules/types";
import { formatDate } from "../../utils/format";
import { usePrivacyFormat } from "../../privacyContext";
import { saldoColor } from "../../utils/thresholds";

type CashFlowForecastProps = {
  forecast: CashflowForecastResponse | null;
  loading: boolean;
  /** Saldo de caixa atual, para compor o caixa projetado ao fim da janela. */
  saldoAtual: number;
};

export function CashFlowForecast({
  forecast,
  loading,
  saldoAtual,
}: CashFlowForecastProps) {
  const { token } = theme.useToken();
  const { formatCurrency, formatCompactCurrency } = usePrivacyFormat();

  const entradasPrevistas = forecast?.entradasPrevistas ?? 0;
  const saidasPrevistas = forecast?.saidasPrevistas ?? 0;
  const resultadoPrevisto = forecast?.resultadoPrevisto ?? 0;
  const caixaProjetado = saldoAtual + resultadoPrevisto;

  const serie = (forecast?.serie ?? []).map((point) => ({
    ...point,
    data: formatDate(point.data).slice(0, 5), // DD/MM
  }));

  const axisConfig = {
    x: {
      title: false,
      labelFill: token.colorText,
      labelFontSize: 12,
      labelFontWeight: 500,
      // Datas na horizontal, em formato abreviado — rótulo rotacionado obriga
      // a inclinar a cabeça para ler.
      labelAutoRotate: false as const,
      labelAutoHide: true as const,
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
      title="Fluxo de caixa previsto"
      scope="previsto"
      footnote="Cada barra é um evento previsto em uma data — não uma tendência diária."
    >
      <Card>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <Row gutter={[16, 16]} align="stretch">
            <Col xs={24} lg={16} style={{ display: "flex" }}>
              {serie.length === 0 ? (
                <Empty description="Nenhuma movimentação prevista para os próximos 30 dias." />
              ) : (
                // flex + minHeight dá ao gráfico uma altura concreta igual à
                // da coluna de KPIs ao lado — sem isso o autoFit do G2 usa os
                // 280px do height fixo e sobra vão vazio até a base do card.
                <div style={{ flex: 1, minHeight: 280 }}>
                  <Column
                    data={serie}
                    xField="data"
                    yField="valor"
                    colorField="tipo"
                    // dodgeX é o que põe entrada e saída lado a lado no G2 v5.
                    // Sem ele, duas séries na mesma data se empilham e o valor
                    // lido no eixo deixa de ser o do lançamento.
                    transform={[{ type: "dodgeX" }]}
                    axis={axisConfig}
                    scale={{
                      color: {
                        domain: ["Entrada", "Saída"],
                        range: [token.colorSuccess, token.colorError],
                      },
                      // Sem domainMin as barras nascem do menor valor da
                      // série, não da base do quadro — força o eixo Y a
                      // iniciar em 0.
                      y: { domainMin: 0 },
                    }}
                    // Sem isto a legenda herda um cinza escuro do tema padrão
                    // do G2 e "Entrada"/"Saída" somem no fundo escuro.
                    legend={{
                      color: {
                        itemLabelFill: token.colorText,
                        itemLabelFontSize: 12,
                      },
                    }}
                    tooltip={{
                      items: [
                        { field: "valor", valueFormatter: formatCurrency },
                      ],
                    }}
                    style={{
                      radiusTopLeft: 4,
                      radiusTopRight: 4,
                      maxWidth: 28,
                    }}
                  />
                </div>
              )}
            </Col>
            <Col xs={24} lg={8}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  height: "100%",
                }}
              >
                <Kpi
                  label="Entradas previstas"
                  value={formatCurrency(entradasPrevistas)}
                  hint="Soma dos lançamentos de entrada ainda não realizados, com data prevista nos próximos 30 dias."
                />
                <Kpi
                  label="Saídas previstas"
                  value={formatCurrency(saidasPrevistas)}
                  hint="Soma dos lançamentos de saída ainda não realizados, com data prevista nos próximos 30 dias."
                />
                <Kpi
                  label="Resultado previsto do período"
                  value={formatCurrency(resultadoPrevisto)}
                  color={saldoColor(resultadoPrevisto, token)}
                  hint="Entradas menos saídas previstas na janela. Não é saldo — é o que a janela adiciona ou tira do caixa."
                />
                <Kpi
                  label="Caixa projetado ao fim da janela"
                  value={formatCurrency(caixaProjetado)}
                  color={saldoColor(caixaProjetado, token)}
                  hint="Saldo de caixa atual somado ao resultado previsto do período."
                />
              </div>
            </Col>
          </Row>
        )}
      </Card>
    </SectionBlock>
  );
}
