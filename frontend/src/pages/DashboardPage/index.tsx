import { Bar, Column } from "@ant-design/charts";
import { DownloadOutlined } from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Empty,
  Grid,
  Spin,
  Statistic,
  Table,
  message,
  theme,
  type TableColumnsType,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { useMemo, useRef, useState } from "react";
import type { Expense } from "../../api/modules/types";
import { useExpenseData } from "../../api/modules/useExpenseData";
import { useActiveGroup } from "../../layouts/groupContext";
import { usePrivateMobileHeader } from "../../layouts/privateMobileHeader";
import { getErrorMessage } from "../../utils/errors";
import { formatCompactCurrency, formatCurrency } from "../../utils/format";
import styles from "./dashboard.module.css";

const { RangePicker } = DatePicker;

const CHART_GRADIENT_H = "l(0) 0:#3b82f6 1:#60a5fa";
const CHART_GRADIENT_V = "l(90) 0:#3b82f6 1:#60a5fa";

type BreakdownItem = {
  name: string;
  value: number;
};

type SupplierTotal = {
  supplier: string;
  total: number;
  count: number;
};

function breakdownHeight(itemCount: number) {
  return Math.max(160, itemCount * 44 + 40);
}

function withHeadroom(items: { value: number }[], factor: number) {
  const max = items.reduce((m, item) => Math.max(m, item.value), 0);
  return max > 0 ? max * factor : undefined;
}

function maxValue(items: BreakdownItem[]) {
  return items.reduce((m, item) => Math.max(m, item.value), 0) || 1;
}

function buildBreakdown(
  expenses: Expense[],
  keyOf: (expense: Expense) => string,
): BreakdownItem[] {
  const totals = new Map<string, number>();
  expenses.forEach((expense) => {
    const key = keyOf(expense);
    totals.set(key, (totals.get(key) || 0) + expense.amount);
  });
  return Array.from(totals, ([name, value]) => ({ name, value })).sort(
    (a, b) => b.value - a.value,
  );
}

function BreakdownList({ items }: Readonly<{ items: BreakdownItem[] }>) {
  const max = maxValue(items);
  return (
    <div className={styles.breakdownList}>
      {items.map((item) => (
        <div key={item.name} className={styles.breakdownItem}>
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownName}>{item.name}</span>
            <span className={styles.breakdownValue}>
              {formatCurrency(item.value)}
            </span>
          </div>
          <div className={styles.breakdownBarTrack}>
            <div
              className={styles.breakdownBarFill}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { token } = theme.useToken();

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

  usePrivateMobileHeader("Dashboard");
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.md);
  const [messageApi, contextHolder] = message.useMessage();
  const { activeGroupId, activeGroup } = useActiveGroup();

  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const dashboardRef = useRef<HTMLElement>(null);

  const { expenses, categoryMap, sourceMap, loading } = useExpenseData(
    activeGroupId,
    (errorMessage) => messageApi.error(errorMessage),
  );

  const filteredExpenses = useMemo(() => {
    if (!range) {
      return expenses;
    }
    const [start, end] = range;
    const startBoundary = start.startOf("day");
    const endBoundary = end.endOf("day");
    return expenses.filter((expense) => {
      const date = dayjs(expense.date);
      return (
        (date.isSame(startBoundary) || date.isAfter(startBoundary)) &&
        (date.isSame(endBoundary) || date.isBefore(endBoundary))
      );
    });
  }, [expenses, range]);

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses],
  );

  const projectTotal = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );
  const plannedSpending = activeGroup?.plannedSpending ?? 0;
  const freeRevenue = plannedSpending - projectTotal;

  const progressPct =
    plannedSpending > 0 ? (totalAmount / plannedSpending) * 100 : 0;
  const progressWidth = Math.min(100, Math.max(0, progressPct));

  const categoryBreakdown = useMemo(
    () =>
      buildBreakdown(
        filteredExpenses,
        (expense) =>
          categoryMap.get(expense.categoryId)?.name || "Sem categoria",
      ),
    [filteredExpenses, categoryMap],
  );

  const sourceBreakdown = useMemo(
    () =>
      buildBreakdown(
        filteredExpenses,
        (expense) => sourceMap.get(expense.sourceId)?.name || "Sem fonte",
      ),
    [filteredExpenses, sourceMap],
  );

  const paymentMethodBreakdown = useMemo(
    () => buildBreakdown(filteredExpenses, (expense) => expense.paymentMethod),
    [filteredExpenses],
  );

  const monthlyEvolution = useMemo(() => {
    const totals = new Map<string, number>();
    filteredExpenses.forEach((expense) => {
      const key = dayjs(expense.date).format("YYYY-MM");
      totals.set(key, (totals.get(key) || 0) + expense.amount);
    });
    return Array.from(totals, ([key, value]) => ({
      key,
      month: dayjs(`${key}-01`).format("MMM/YY"),
      value,
    })).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredExpenses]);

  const topSuppliers = useMemo<SupplierTotal[]>(() => {
    const totals = new Map<string, { total: number; count: number }>();
    filteredExpenses.forEach((expense) => {
      const key = expense.supplier?.trim() || "Sem fornecedor";
      const current = totals.get(key) || { total: 0, count: 0 };
      totals.set(key, {
        total: current.total + expense.amount,
        count: current.count + 1,
      });
    });
    return Array.from(totals, ([supplier, data]) => ({ supplier, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredExpenses]);

  const supplierColumns: TableColumnsType<SupplierTotal> = [
    { title: "Fornecedor", dataIndex: "supplier", key: "supplier" },
    { title: "Lançamentos", dataIndex: "count", key: "count", width: 140 },
    {
      title: "Total gasto",
      dataIndex: "total",
      key: "total",
      render: (value: number) => formatCurrency(value),
    },
  ];

  const hasData = filteredExpenses.length > 0;

  const exportPdf = async () => {
    if (!dashboardRef.current) {
      return;
    }

    setExportingPdf(true);
    try {
      const dataUrl = await toPng(dashboardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0f1b35",
        filter: (node) =>
          !(node instanceof HTMLElement && node.classList.contains("export-ignore")),
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

      pdf.save("dashboard.pdf");
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Erro ao exportar dashboard."));
    } finally {
      setExportingPdf(false);
    }
  };

  const statValueClassNames = { title: styles.label, content: styles.value };

  return (
    <section ref={dashboardRef}>
      {contextHolder}
      <div className={styles.page}>
        <div className={styles.blobLayer}>
          <div className={`${styles.blob} ${styles.blob1}`} />
          <div className={`${styles.blob} ${styles.blob2}`} />
          <div className={`${styles.blob} ${styles.blob3}`} />
        </div>

        <div className={styles.content}>
          <div className={styles.headerRow}>
            {isDesktop && (
              <div>
                <h1 className={styles.pageTitle}>Dashboard</h1>
                <p className={styles.pageDescription}>
                  Resumo do que foi gasto, quanto e como, na obra.
                </p>
              </div>
            )}
            <div className={`${styles.exportBtnWrap} export-ignore`}>
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={exportPdf}
                loading={exportingPdf}
              >
                Exportar PDF
              </Button>
            </div>
          </div>

          <div className={styles.filterRow}>
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
          </div>

          <Spin spinning={loading}>
            <div className={styles.kpiGrid}>
              <div className={styles.glassCard}>
                <Statistic
                  title="Total gasto"
                  value={totalAmount}
                  formatter={() => formatCurrency(totalAmount)}
                  classNames={statValueClassNames}
                />
                <div className={styles.subtext}>
                  de {formatCurrency(plannedSpending)}
                </div>
              </div>
              <div className={styles.glassCard}>
                <Statistic
                  title="Progresso"
                  value={progressPct}
                  formatter={() => `${Math.round(progressPct)}%`}
                  classNames={statValueClassNames}
                />
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
              </div>
              <div className={styles.glassCard}>
                <Statistic
                  title="Lançamentos"
                  value={filteredExpenses.length}
                  classNames={statValueClassNames}
                />
              </div>
            </div>

            {!loading && !hasData ? (
              <div className={styles.glassCard}>
                <Empty description="Nenhum lançamento no período selecionado. Cadastre gastos na aba Controle." />
              </div>
            ) : (
              <>
                <div className={styles.chartsRow}>
                  <div className={styles.glassCard}>
                    <h3 className={styles.cardTitle}>Gasto por categoria</h3>
                    <Bar
                      data={categoryBreakdown}
                      xField="name"
                      yField="value"
                      height={breakdownHeight(categoryBreakdown.length)}
                      axis={barAxisConfig}
                      scale={{
                        y: {
                          nice: true,
                          domainMax: withHeadroom(categoryBreakdown, 1.25),
                        },
                      }}
                      style={{ fill: CHART_GRADIENT_H }}
                      label={{
                        text: (datum: BreakdownItem) =>
                          formatCurrency(datum.value),
                        position: "right",
                        style: {
                          ...labelStyle(),
                          textAlign: "start" as const,
                          dx: 8,
                        },
                        transform: [{ type: "exceedAdjust" }],
                      }}
                      tooltip={{
                        items: [{ field: "value", valueFormatter: formatCurrency }],
                      }}
                    />
                  </div>
                  <div className={styles.glassCard}>
                    <h3 className={styles.cardTitle}>Evolução mensal</h3>
                    <Column
                      data={monthlyEvolution}
                      xField="month"
                      yField="value"
                      height={300}
                      axis={columnAxisConfig}
                      scale={{
                        y: {
                          nice: true,
                          domainMax: withHeadroom(monthlyEvolution, 1.3),
                        },
                      }}
                      label={{
                        text: (datum: { value: number }) =>
                          formatCurrency(datum.value),
                        position: "top" as const,
                        style: { ...labelStyle(), dy: -15 },
                        transform: [{ type: "overlapHide" }],
                      }}
                      tooltip={{
                        items: [{ field: "value", valueFormatter: formatCurrency }],
                      }}
                      style={{
                        fill: CHART_GRADIENT_V,
                        radiusTopLeft: 4,
                        radiusTopRight: 4,
                        maxWidth: 40,
                      }}
                    />
                  </div>
                </div>

                <div className={styles.summaryRow}>
                  <div className={styles.glassCard}>
                    <h3 className={styles.cardTitle}>Por Fonte</h3>
                    <BreakdownList items={sourceBreakdown} />
                  </div>
                  <div className={styles.glassCard}>
                    <h3 className={styles.cardTitle}>Por Pagamento</h3>
                    <BreakdownList items={paymentMethodBreakdown} />
                  </div>
                  <div className={styles.glassCard}>
                    <h3 className={styles.cardTitle}>Status</h3>
                    <div className={styles.statusRow}>
                      <span className={styles.label}>Categorias usadas</span>
                      <span className={styles.value}>
                        {categoryBreakdown.length}
                      </span>
                    </div>
                    <div className={styles.statusRow}>
                      <span className={styles.label}>Receita livre</span>
                      <span
                        className={`${styles.value} ${freeRevenue < 0 ? styles.negative : styles.positive
                          }`}
                      >
                        {formatCurrency(freeRevenue)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.glassCard}>
                  <h3 className={styles.cardTitle}>Top fornecedores</h3>
                  <Table
                    rowKey="supplier"
                    columns={supplierColumns}
                    dataSource={topSuppliers}
                    pagination={false}
                  />
                </div>
              </>
            )}
          </Spin>
        </div>
      </div>
    </section>
  );
}
