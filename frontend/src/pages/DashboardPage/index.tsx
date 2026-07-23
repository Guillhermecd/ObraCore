import { Bar, Column } from "@ant-design/charts";
import { DownloadOutlined } from "@ant-design/icons";
import {
  Alert as AntAlert,
  Button,
  Card,
  DatePicker,
  Empty,
  Progress,
  Skeleton,
  Table,
  Tabs,
  message,
  theme,
  type TableColumnsType,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { DashboardService } from "../../api/modules/DashboardService";
import type {
  BreakdownItem,
  DashboardObraResponse,
  TopSupplier,
} from "../../api/modules/types";
import { Kpi } from "../../components/Kpi";
import { kpiGridStyle } from "../../components/layout";
import { SectionBlock } from "../../components/SectionBlock";
import { GroupSelect } from "../../layouts/GroupSelect";
import { useActiveGroup } from "../../layouts/groupContext";
import { usePrivateMobileHeader } from "../../layouts/privateMobileHeader";
import { formatDate, formatMonth, plural } from "../../utils/format";
import { usePrivacyFormat } from "../../privacyContext";
import { entradaLabel, entradaPendenteLabel } from "../../utils/obra";
import {
  coberturaColor,
  consumoColor,
  saldoColor,
} from "../../utils/thresholds";

const { RangePicker } = DatePicker;

const EXTRAPOLACAO_NOTE =
  "Projeções por extrapolação linear do ritmo de gasto dos últimos 3 meses. Não consideram o cronograma físico da obra.";

const pageHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 16,
  marginBottom: 24,
};

function breakdownHeight(itemCount: number) {
  return Math.max(160, itemCount * 44 + 40);
}

// Espaço extra no topo do eixo dos gráficos, para o rótulo de valor não
// colar no limite do gráfico — puramente visual, não é cálculo financeiro.
function withHeadroom(items: { valor: number }[], factor: number) {
  const max = items.reduce((m, item) => Math.max(m, item.valor), 0);
  return max > 0 ? max * factor : undefined;
}

export function DashboardPage() {
  const { token } = theme.useToken();
  const {
    formatCurrency,
    formatCompactCurrency,
    formatPercent,
    formatMeses,
  } = usePrivacyFormat();

  const pageTitleStyle: CSSProperties = {
    margin: 0,
    color: token.colorTextHeading,
    fontSize: 26,
  };

  function labelStyle() {
    return { fill: token.colorTextHeading, fontSize: 12, fontWeight: 600 };
  }

  const barAxisConfig = {
    x: {
      title: false,
      labelFill: token.colorText,
      labelFontSize: 12,
      labelFontWeight: 500,
    },
    y: false as const,
  };

  const columnAxisConfig = {
    x: {
      title: false,
      labelFill: token.colorText,
      labelFontSize: 12,
      labelFontWeight: 500,
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

  usePrivateMobileHeader("Obra");
  const [messageApi, contextHolder] = message.useMessage();
  const { activeGroupId, loading: groupsLoading } = useActiveGroup();

  const [obra, setObra] = useState<DashboardObraResponse | null>(null);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const dashboardRef = useRef<HTMLElement>(null);

  // Chave da requisição em curso. `loading` é derivado dela em vez de ser um
  // estado próprio: assim trocar de obra ou de período já deixa a tela em
  // carregamento no mesmo render, sem um setState extra dentro do efeito.
  const from = range?.[0]?.format("YYYY-MM-DD");
  const to = range?.[1]?.format("YYYY-MM-DD");
  const requestKey = `${activeGroupId ?? ""}|${from ?? ""}|${to ?? ""}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  // Sem obra ativa não há o que carregar: sem esta guarda a tela ficava em
  // esqueleto para sempre quando a lista de obras falhava ou vinha vazia.
  const noActiveGroup = !groupsLoading && !activeGroupId;
  const loading = !noActiveGroup && loadedKey !== requestKey;

  useEffect(() => {
    if (!activeGroupId) {
      return;
    }

    DashboardService.obra(activeGroupId, from, to)
      .then((response) => setObra(response))
      .catch((error: unknown) => {
        messageApi.error(
          error instanceof Error ? error.message : "Erro ao carregar dados.",
        );
      })
      .finally(() => setLoadedKey(requestKey));
  }, [messageApi, activeGroupId, from, to, requestKey]);

  const tipoObra = obra?.tipoObra ?? "PROPRIA";
  const consumidoPct = obra?.consumidoPct ?? null;
  const coberturaPct = obra?.coberturaPct ?? null;
  const hasFlowData = (obra?.qtdLancamentos ?? 0) > 0;

  const monthlyEvolution =
    obra?.evolucaoMensal.map((point) => ({
      mes: dayjs(`${point.mes}-01`).format("MMM/YY"),
      valor: point.valor,
    })) ?? [];

  const supplierColumns: TableColumnsType<TopSupplier> = [
    { title: "Fornecedor", dataIndex: "nome", key: "nome" },
    {
      title: "Lançamentos",
      dataIndex: "count",
      key: "count",
      width: 140,
      render: (value: number) => plural(value, "lançamento", "lançamentos"),
    },
    {
      title: "Total gasto",
      dataIndex: "total",
      key: "total",
      render: (value: number) => formatCurrency(value),
    },
  ];

  function renderBreakdownTab(data: BreakdownItem[]) {
    if (loading) {
      return <Skeleton active paragraph={{ rows: 4 }} />;
    }
    if (data.length === 0) {
      return <Empty description="Nenhum gasto no período selecionado." />;
    }
    return (
      <Bar
        data={data}
        xField="nome"
        yField="valor"
        // `color` não é aplicado pelo adaptor do Plots v2 (a barra ficava no
        // azul padrão do G2, ignorando a marca) — a cor de série única vai em
        // `style.fill`.
        style={{ fill: token.colorPrimary }}
        height={breakdownHeight(data.length)}
        axis={barAxisConfig}
        // Teto de domínio ~25% acima do maior valor deixa a maior barra em
        // torno de 80% da largura útil: o rótulo do maior valor cabe sem
        // encostar na borda, e a largura segue proporcional ao valor.
        scale={{
          y: { nice: false, domainMin: 0, domainMax: withHeadroom(data, 1.25) },
        }}
        label={{
          text: (datum: BreakdownItem) => formatCurrency(datum.valor),
          position: "right",
          style: { ...labelStyle(), textAlign: "start" as const },
          transform: [{ type: "exceedAdjust" }],
        }}
        tooltip={{
          items: [{ field: "valor", valueFormatter: formatCurrency }],
        }}
      />
    );
  }

  const exportPdf = async () => {
    if (!dashboardRef.current) {
      return;
    }

    setExportingPdf(true);
    try {
      const dataUrl = await toPng(dashboardRef.current, {
        pixelRatio: 2,
        backgroundColor: token.colorBgLayout,
        filter: (node) =>
          !(
            node instanceof HTMLElement &&
            node.classList.contains("export-ignore")
          ),
      });

      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error("Erro ao processar imagem do dashboard."));
        image.src = dataUrl;
      });

      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidthMm = pageWidth;
      const imgHeightMm = (image.height * imgWidthMm) / image.width;

      let heightLeft = imgHeightMm;
      let position = 0;

      pdf.addImage(dataUrl, "PNG", 0, position, imgWidthMm, imgHeightMm);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeightMm;
        pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 0, position, imgWidthMm, imgHeightMm);
        heightLeft -= pageHeight;
      }

      pdf.save("obra.pdf");
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao exportar dashboard.",
      );
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <section ref={dashboardRef}>
      {contextHolder}
      <div style={pageHeaderRowStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <h1 style={pageTitleStyle}>Obra — Financeiro</h1>
          <GroupSelect />
          {/* Fora do `export-ignore` de propósito: o PDF esconde o seletor de
              datas, então sem este rótulo o arquivo exportado mostraria dados
              filtrados sem dizer de que período são. */}
          <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
            {range === null
              ? "Todo o período"
              : `${range[0].format("DD/MM/YYYY")} a ${range[1].format("DD/MM/YYYY")}`}
          </span>
        </div>
        <div
          className="export-ignore"
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <RangePicker
            value={range}
            onChange={(values) =>
              setRange(
                values && values[0] && values[1]
                  ? [values[0], values[1]]
                  : null,
              )
            }
            format="DD/MM/YYYY"
            placeholder={["Início", "Fim"]}
            allowClear
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={exportPdf}
            loading={exportingPdf}
          >
            Exportar PDF
          </Button>
        </div>
      </div>

      {noActiveGroup && (
        <Card>
          <Empty description="Nenhuma obra selecionada. Cadastre uma obra em Grupos para ver o financeiro dela." />
        </Card>
      )}

      {!noActiveGroup && !loading && (obra?.pendencias ?? 0) > 0 && (
        <AntAlert
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
          message={`${plural(obra?.pendencias ?? 0, "pendência", "pendências")} nesta obra`}
          description={`${formatCurrency(obra?.saidasPendentes ?? 0)} em saídas previstas ainda fora do custo realizado.`}
        />
      )}

      {!noActiveGroup && (
        <>
          <SectionBlock title="Orçamento" scope="acumulado">
            <div style={kpiGridStyle}>
              <Kpi
                loading={loading}
                label="Orçamento previsto"
                value={formatCurrency(obra?.orcamentoPrevisto ?? 0)}
                hint="Gasto planejado cadastrado para esta obra."
              />
              <Kpi
                loading={loading}
                label="Custo realizado"
                value={formatCurrency(obra?.custoRealizado ?? 0)}
                hint="Soma das saídas já realizadas (com data realizada preenchida) nesta obra."
              />
              <Kpi
                loading={loading}
                label="Saldo de orçamento"
                value={formatCurrency(obra?.saldoOrcamento ?? 0)}
                color={saldoColor(obra?.saldoOrcamento ?? 0, token)}
                hint="Orçamento previsto menos custo realizado — quanto ainda resta do orçamento."
              />
            </div>

            <Card style={{ marginTop: 16 }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} title={false} />
              ) : consumidoPct === null ? (
                <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
                  Sem orçamento definido para esta obra.
                </div>
              ) : (
                <>
                  <Progress
                    percent={Math.min(consumidoPct, 100)}
                    strokeColor={consumoColor(consumidoPct, token)}
                    format={() => `${formatPercent(consumidoPct)} consumido`}
                  />
                  <div
                    style={{ fontSize: 12, color: token.colorTextSecondary }}
                  >
                    {(obra?.saidasPendentes ?? 0) > 0
                      ? `Mais ${formatCurrency(obra?.saidasPendentes ?? 0)} em saídas previstas, ainda fora do realizado.`
                      : "Nenhuma saída prevista fora do realizado."}
                  </div>
                </>
              )}
            </Card>
          </SectionBlock>

          <SectionBlock title="Caixa" scope="acumulado">
            <div style={kpiGridStyle}>
              <Kpi
                loading={loading}
                label={entradaLabel(tipoObra)}
                value={formatCurrency(obra?.totalAportado ?? 0)}
                hint={
                  tipoObra === "CLIENTE"
                    ? "Total já recebido do cliente nesta obra."
                    : "Total de capital aportado nesta obra pelo dono."
                }
              />
              <Kpi
                loading={loading}
                label="Saldo em caixa"
                value={formatCurrency(obra?.saldoEmCaixa ?? 0)}
                color={saldoColor(obra?.saldoEmCaixa ?? 0, token)}
                hint={
                  tipoObra === "CLIENTE"
                    ? "Recebido menos custo realizado — o caixa de fato disponível nesta obra."
                    : "Aportado menos custo realizado — o caixa de fato disponível nesta obra."
                }
              />
              <Kpi
                loading={loading}
                label={entradaPendenteLabel(tipoObra)}
                value={formatCurrency(obra?.aporteAFazer ?? 0)}
                color={
                  (obra?.aporteAFazer ?? 0) > 0
                    ? token.colorWarning
                    : token.colorText
                }
                hint="Quanto ainda precisa entrar para o caixa cobrir o orçamento inteiro da obra."
              />
            </div>

            <Card style={{ marginTop: 16 }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} title={false} />
              ) : coberturaPct === null ? (
                <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
                  Sem orçamento a executar — não há cobertura a calcular.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: 13,
                      color: token.colorTextSecondary,
                      marginBottom: 8,
                    }}
                  >
                    Cobertura de caixa
                  </div>
                  <Progress
                    percent={Math.min(coberturaPct, 100)}
                    strokeColor={coberturaColor(coberturaPct, token)}
                    format={() => formatPercent(coberturaPct)}
                  />
                  <div
                    style={{ fontSize: 12, color: token.colorTextSecondary }}
                  >
                    Quanto o caixa atual cobre do orçamento que ainda resta
                    executar.
                  </div>
                </>
              )}
            </Card>
          </SectionBlock>

          <SectionBlock
            title="Ritmo"
            scope="ritmo"
            footnote={EXTRAPOLACAO_NOTE}
          >
            <div style={kpiGridStyle}>
              <Kpi
                loading={loading}
                label="Gasto médio mensal"
                value={formatCurrency(obra?.gastoMedioMensal ?? 0)}
                hint="Média das saídas realizadas nos últimos 3 meses civis completos (o mês corrente fica de fora por estar parcial)."
              />
              <Kpi
                loading={loading}
                label="Fôlego de caixa"
                value={
                  obra?.folegoMeses == null
                    ? "—"
                    : formatMeses(obra.folegoMeses)
                }
                hint="Saldo em caixa dividido pelo gasto médio mensal — quantos meses o caixa atual sustenta no ritmo de gasto recente."
                detail={
                  obra?.dataProximoAporte
                    ? `Próximo aporte estimado em ${formatDate(obra.dataProximoAporte)}`
                    : "Sem ritmo de gasto para projetar."
                }
              />
              <Kpi
                loading={loading}
                label="Esgotamento do orçamento"
                value={
                  obra?.mesEsgotamentoOrcamento
                    ? formatMonth(obra.mesEsgotamentoOrcamento)
                    : "—"
                }
                hint="Mês em que o orçamento que ainda resta se esgotaria, extrapolando o gasto médio mensal atual."
                detail={
                  obra?.mesEsgotamentoOrcamento
                    ? "Mês projetado no ritmo atual."
                    : "Sem orçamento restante ou sem ritmo de gasto."
                }
              />
            </div>
          </SectionBlock>

          <SectionBlock title="Composição do gasto" scope="periodo">
            <Card>
              {!loading && !hasFlowData ? (
                <Empty description="Nenhum lançamento no período selecionado. Cadastre gastos na aba Controle." />
              ) : (
                <Tabs
                  items={[
                    {
                      key: "categoria",
                      label: "Categoria",
                      children: renderBreakdownTab(
                        obra?.composicao.categoria ?? [],
                      ),
                    },
                    {
                      key: "fonte",
                      label: "Fonte",
                      children: renderBreakdownTab(
                        obra?.composicao.fonte ?? [],
                      ),
                    },
                    {
                      key: "formaPagamento",
                      label: "Forma de pagamento",
                      children: renderBreakdownTab(
                        obra?.composicao.formaPagamento ?? [],
                      ),
                    },
                  ]}
                />
              )}
            </Card>
          </SectionBlock>

          <SectionBlock title="Evolução mensal do gasto" scope="periodo">
            <Card>
              {loading ? (
                <Skeleton active paragraph={{ rows: 5 }} />
              ) : monthlyEvolution.length === 0 ? (
                <Empty description="Nenhum gasto no período selecionado." />
              ) : (
                <Column
                  data={monthlyEvolution}
                  xField="mes"
                  yField="valor"
                  height={300}
                  axis={columnAxisConfig}
                  scale={{
                    y: {
                      nice: true,
                      domainMax: withHeadroom(monthlyEvolution, 1.18),
                    },
                  }}
                  label={{
                    text: (datum: { valor: number }) =>
                      formatCurrency(datum.valor),
                    position: "top" as const,
                    style: labelStyle(),
                    transform: [{ type: "overlapHide" }],
                  }}
                  tooltip={{
                    items: [{ field: "valor", valueFormatter: formatCurrency }],
                  }}
                  style={{
                    fill: token.colorPrimary,
                    radiusTopLeft: 4,
                    radiusTopRight: 4,
                    maxWidth: 40,
                  }}
                />
              )}
            </Card>
          </SectionBlock>

          <SectionBlock title="Top fornecedores" scope="periodo">
            <Card>
              {loading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : (
                <Table
                  rowKey="nome"
                  columns={supplierColumns}
                  dataSource={obra?.topFornecedores ?? []}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  locale={{
                    emptyText: (
                      <Empty description="Nenhum fornecedor no período selecionado." />
                    ),
                  }}
                />
              )}
            </Card>
          </SectionBlock>
        </>
      )}
    </section>
  );
}
