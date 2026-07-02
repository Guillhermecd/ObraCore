import { Bar, Column } from "@ant-design/charts";
import {
  Card,
  DatePicker,
  Empty,
  Grid,
  Statistic,
  Table,
  message,
  type TableColumnsType,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { ExpenseCategoryService } from "../../api/modules/ExpenseCategoryService";
import { ExpenseService } from "../../api/modules/ExpenseService";
import { ExpenseSourceService } from "../../api/modules/ExpenseSourceService";
import type {
  Expense,
  ExpenseCategory,
  ExpenseSource,
} from "../../api/modules/types";
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

const pageHeaderStyle: CSSProperties = {
  marginBottom: 20,
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: "#102A43",
  fontSize: 26,
};

const pageDescriptionStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "#627D98",
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

function labelStyle() {
  return { fill: "#102A43", fontSize: 12, fontWeight: 600 };
}

const barAxisConfig = {
  x: {
    title: false,
    labelFill: "#1F2933",
    labelFontSize: 12,
    labelFontWeight: 500,
  },
  y: false as const,
};

const columnAxisConfig = {
  x: {
    title: false,
    labelFill: "#1F2933",
    labelFontSize: 12,
    labelFontWeight: 500,
  },
  y: {
    title: false,
    grid: { style: { stroke: "#E5E7EB", lineWidth: 1 } },
    labelFill: "#1F2933",
    labelFontSize: 12,
    labelFontWeight: 500,
    labelFormatter: formatCompactCurrency,
  },
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
  usePrivateMobileHeader("Dashboard");
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.md);
  const [messageApi, contextHolder] = message.useMessage();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [sources, setSources] = useState<ExpenseSource[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);

  useEffect(() => {
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
  }, [messageApi]);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const sourceMap = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
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
  const averageTicket =
    filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0;

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

  return (
    <section>
      {contextHolder}
      {isDesktop && (
        <div style={pageHeaderStyle}>
          <h1 style={pageTitleStyle}>Dashboard</h1>
          <p style={pageDescriptionStyle}>
            Resumo do que foi gasto, quanto e como, na obra.
          </p>
        </div>
      )}

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