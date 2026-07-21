import { Bar, Column } from "@ant-design/charts";
import { DownloadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Grid,
  Statistic,
  Table,
  message,
  theme,
  type TableColumnsType,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExpenseCategoryService } from "../../api/modules/ExpenseCategoryService";
import { ExpenseService } from "../../api/modules/ExpenseService";
import { ExpenseSourceService } from "../../api/modules/ExpenseSourceService";
import type {
  Expense,
  ExpenseCategory,
  ExpenseSource,
} from "../../api/modules/types";
import { useActiveGroup } from "../../layouts/groupContext";
import { usePrivateMobileHeader } from "../../layouts/privateMobileHeader";
import { formatCompactCurrency, formatCurrency } from "../../utils/format";

const { RangePicker } = DatePicker;

const BRAND_BLUE = "#0050FF";

type BreakdownItem = {
  name: string;
  value: number;
};

type SupplierTotal = {
  supplier: string;
  total: number;
  count: number;
};

const pageHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: 16,
  marginBottom: 20,
};

const budgetBoxesStyle: CSSProperties = {
  display: "flex",
  gap: 16,
};

const filterRowStyle: CSSProperties = {
  marginBottom: 20,
};

const kpiGridStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  marginBottom: 20,
};

const chartsGridStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  marginBottom: 16,
};

function breakdownHeight(itemCount: number) {
  return Math.max(160, itemCount * 44 + 40);
}

function withHeadroom(items: { value: number }[], factor: number) {
  const max = items.reduce((m, item) => Math.max(m, item.value), 0);
  return max > 0 ? max * factor : undefined;
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

export function DashboardPage() {
  const { token } = theme.useToken();

  const pageTitleStyle: CSSProperties = {
    margin: 0,
    color: token.colorTextHeading,
    fontSize: 26,
  };

  const pageDescriptionStyle: CSSProperties = {
    margin: "4px 0 0",
    color: token.colorTextSecondary,
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

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [sources, setSources] = useState<ExpenseSource[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const dashboardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!activeGroupId) {
      return;
    }

    Promise.all([
      ExpenseCategoryService.list(),
      ExpenseSourceService.list(),
      ExpenseService.list(),
    ])
      .then(([categoriesResponse, sourcesResponse, expensesResponse]) => {
        setCategories(categoriesResponse.categories);
        setSources(sourcesResponse.sources);
        setExpenses(expensesResponse.expenses);
      })
      .catch((error: unknown) => {
        messageApi.error(
          error instanceof Error ? error.message : "Erro ao carregar dados.",
        );
      })
      .finally(() => setLoading(false));
  }, [messageApi, activeGroupId]);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const sourceMap = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );

  // Este dashboard de projeto é focado em custo (SAIDA). Com o console
  // consolidado, a mesma coleção de lançamentos passou a incluir ENTRADA
  // também — sem este filtro, receita seria somada como se fosse gasto.
  const saidaExpenses = useMemo(
    () => expenses.filter((expense) => (expense.tipo ?? "SAIDA") === "SAIDA"),
    [expenses],
  );

  const filteredExpenses = useMemo(() => {
    if (!range) {
      return saidaExpenses;
    }
    const [start, end] = range;
    const startBoundary = start.startOf("day");
    const endBoundary = end.endOf("day");
    return saidaExpenses.filter((expense) => {
      const date = dayjs(expense.date);
      return (
        (date.isSame(startBoundary) || date.isAfter(startBoundary)) &&
        (date.isSame(endBoundary) || date.isBefore(endBoundary))
      );
    });
  }, [saidaExpenses, range]);

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses],
  );
  const averageTicket =
    filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0;

  const projectTotal = useMemo(
    () => saidaExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [saidaExpenses],
  );
  const plannedSpending = activeGroup?.plannedSpending ?? 0;
  const budgetBalance = plannedSpending - projectTotal;

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
        backgroundColor: token.colorBgLayout,
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
        {isDesktop && (
          <div>
            <h1 style={pageTitleStyle}>Dashboard</h1>
            <p style={pageDescriptionStyle}>
              Resumo do que foi gasto, quanto e como, na obra.
            </p>
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 16,
            flexWrap: "wrap",
            flex: isDesktop ? "0 0 auto" : "1 1 100%",
          }}
        >
          <Card
            className="export-ignore"
            styles={{
              body: { height: "100%", display: "flex", alignItems: "center" },
            }}
          >
            <Button
              icon={<DownloadOutlined />}
              onClick={exportPdf}
              loading={exportingPdf}
            >
              Exportar PDF
            </Button>
          </Card>
          <div style={budgetBoxesStyle}>
            <Card loading={loading} style={{ flex: 1, minWidth: 160 }}>
              <Statistic
                title="Gasto Planejado"
                value={plannedSpending}
                formatter={() => formatCurrency(plannedSpending)}
              />
            </Card>
            <Card loading={loading} style={{ flex: 1, minWidth: 160 }}>
              <Statistic
                title="Saldo de orçamento"
                value={budgetBalance}
                formatter={() => formatCurrency(budgetBalance)}
                styles={{
                  content: {
                    color:
                      budgetBalance < 0 ? token.colorError : token.colorSuccess,
                  },
                }}
              />
            </Card>
          </div>
        </div>
      </div>

      <div style={filterRowStyle}>
        <RangePicker
          value={range}
          onChange={(values) =>
            setRange(
              values && values[0] && values[1] ? [values[0], values[1]] : null,
            )
          }
          format="DD/MM/YYYY"
          placeholder={["Início", "Fim"]}
          allowClear
        />
      </div>

      <div
        style={{
          ...kpiGridStyle,
          gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)",
        }}
      >
        <Card loading={loading}>
          <Statistic
            title="Total gasto"
            value={totalAmount}
            formatter={() => formatCurrency(totalAmount)}
          />
        </Card>
        <Card loading={loading}>
          <Statistic title="Lançamentos" value={filteredExpenses.length} />
        </Card>
        <Card loading={loading}>
          <Statistic
            title="Ticket médio"
            value={averageTicket}
            formatter={() => formatCurrency(averageTicket)}
          />
        </Card>
        <Card loading={loading}>
          <Statistic
            title="Categorias usadas"
            value={categoryBreakdown.length}
          />
        </Card>
      </div>

      {!loading && !hasData ? (
        <Card>
          <Empty description="Nenhum lançamento no período selecionado. Cadastre gastos na aba Controle." />
        </Card>
      ) : (
        <>
          <div
            style={{
              ...chartsGridStyle,
              gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr",
            }}
          >
            <Card title="Gasto por categoria" loading={loading}>
              <Bar
                data={categoryBreakdown}
                xField="name"
                yField="value"
                color={BRAND_BLUE}
                height={breakdownHeight(categoryBreakdown.length)}
                axis={barAxisConfig}
                scale={{
                  y: {
                    nice: true,
                    domainMax: withHeadroom(categoryBreakdown, 1.25),
                  },
                }}
                label={{
                  text: (datum: BreakdownItem) => formatCurrency(datum.value),
                  position: "right",
                  style: { ...labelStyle(), textAlign: "start" as const },
                  transform: [{ type: "exceedAdjust" }],
                }}
                tooltip={{
                  items: [{ field: "value", valueFormatter: formatCurrency }],
                }}
              />
            </Card>
            <Card title="Gasto por fonte" loading={loading}>
              <Bar
                data={sourceBreakdown}
                xField="name"
                yField="value"
                color={BRAND_BLUE}
                height={breakdownHeight(sourceBreakdown.length)}
                axis={barAxisConfig}
                scale={{
                  y: {
                    nice: true,
                    domainMax: withHeadroom(sourceBreakdown, 1.25),
                  },
                }}
                label={{
                  text: (datum: BreakdownItem) => formatCurrency(datum.value),
                  position: "right",
                  style: { ...labelStyle(), textAlign: "start" as const },
                  transform: [{ type: "exceedAdjust" }],
                }}
                tooltip={{
                  items: [{ field: "value", valueFormatter: formatCurrency }],
                }}
              />
            </Card>
            <Card title="Gasto por forma de pagamento" loading={loading}>
              <Bar
                data={paymentMethodBreakdown}
                xField="name"
                yField="value"
                color={BRAND_BLUE}
                height={breakdownHeight(paymentMethodBreakdown.length)}
                axis={barAxisConfig}
                scale={{
                  y: {
                    nice: true,
                    domainMax: withHeadroom(paymentMethodBreakdown, 1.25),
                  },
                }}
                label={{
                  text: (datum: BreakdownItem) => formatCurrency(datum.value),
                  position: "right",
                  style: { ...labelStyle(), textAlign: "start" as const },
                  transform: [{ type: "exceedAdjust" }],
                }}
                tooltip={{
                  items: [{ field: "value", valueFormatter: formatCurrency }],
                }}
              />
            </Card>
          </div>

          <Card
            title="Evolução mensal do gasto"
            loading={loading}
            style={{ marginBottom: 16 }}
          >
            <Column
              data={monthlyEvolution}
              xField="month"
              yField="value"
              color={BRAND_BLUE}
              height={300}
              axis={columnAxisConfig}
              scale={{
                y: {
                  nice: true,
                  domainMax: withHeadroom(monthlyEvolution, 1.18),
                },
              }}
              label={{
                text: (datum: { value: number }) => formatCurrency(datum.value),
                position: "top" as const,
                style: labelStyle(),
                transform: [{ type: "overlapHide" }],
              }}
              tooltip={{
                items: [{ field: "value", valueFormatter: formatCurrency }],
              }}
              style={{ radiusTopLeft: 4, radiusTopRight: 4, maxWidth: 40 }}
            />
          </Card>

          <Card title="Top fornecedores" loading={loading}>
            <Table
              rowKey="supplier"
              columns={supplierColumns}
              dataSource={topSuppliers}
              pagination={false}
            />
          </Card>
        </>
      )}
    </section>
  );
}