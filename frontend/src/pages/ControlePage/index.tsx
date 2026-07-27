import {
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Grid,
  Popconfirm,
  Space,
  Table,
  Tag,
  message,
  theme,
  type TableColumnsType,
} from "antd";
import type { FilterValue } from "antd/es/table/interface";
import dayjs from "dayjs";
import type { CSSProperties, Key } from "react";
import { useEffect, useMemo, useState } from "react";
import { ExpenseCategoryService } from "../../api/modules/ExpenseCategoryService";
import { ExpenseService } from "../../api/modules/ExpenseService";
import { ExpenseSourceService } from "../../api/modules/ExpenseSourceService";
import type {
  Expense,
  ExpenseCategory,
  ExpenseSource,
} from "../../api/modules/types";
import { PAYMENT_METHODS } from "../../api/modules/types";
import {
  dateRangeFilter,
  matchesDateRange,
  matchesNumberRange,
  matchesText,
  numberRangeFilter,
  textFilter,
} from "../../components/tableFilters";
import { useActiveGroup } from "../../layouts/groupContext";
import { usePrivateMobileHeader } from "../../layouts/privateMobileHeader";
import { getErrorMessage } from "../../utils/errors";
import { formatDate, plural } from "../../utils/format";
import { usePrivacyFormat } from "../../privacyContext";
import { usePermissions } from "../../layouts/usePermissions";
import { ExpenseDetailModal } from "./ExpenseDetailModal";
import { ExpenseFormModal } from "./ExpenseFormModal";
import { ImportExpensesModal } from "./ImportExpensesModal";

type FormModalState =
  | { mode: "create" }
  | { mode: "edit"; expense: Expense }
  | null;

const pageHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 20,
};

export function ControlePage() {
  const { token } = theme.useToken();
  const { formatCurrency } = usePrivacyFormat();
  const { canWrite } = usePermissions();
  const pageTitleStyle: CSSProperties = {
    margin: 0,
    color: token.colorTextHeading,
    fontSize: 26,
  };

  const pageDescriptionStyle: CSSProperties = {
    margin: "4px 0 0",
    color: token.colorTextSecondary,
  };

  const bulkActionBarStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    padding: "8px 12px",
    background: token.colorBgLayout,
    color: token.colorText,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: 8,
  };

  const filterBarStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    fontSize: 13,
    color: token.colorTextSecondary,
  };

  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.md);
  usePrivateMobileHeader("Controle");
  const [messageApi, contextHolder] = message.useMessage();
  const { activeGroupId } = useActiveGroup();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [sources, setSources] = useState<ExpenseSource[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formModalState, setFormModalState] = useState<FormModalState>(null);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filtros controlados: sem isso não há como zerar todas as colunas de uma
  // vez nem saber quantos lançamentos sobraram do recorte.
  const [filters, setFilters] = useState<Record<string, FilterValue | null>>(
    {},
  );
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const hasFilters = Object.values(filters).some(
    (value) => value !== null && value !== undefined && value.length > 0,
  );

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
        messageApi.error(getErrorMessage(error, "Erro ao carregar dados."));
      })
      .finally(() => setLoading(false));
  }, [messageApi, refreshKey, activeGroupId]);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const sourceMap = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );

  const refresh = () => setRefreshKey((key) => key + 1);

  const exportXlsx = async () => {
    setExporting(true);
    try {
      await ExpenseService.exportXlsx();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Erro ao exportar planilha."));
    } finally {
      setExporting(false);
    }
  };

  const bulkDelete = async () => {
    setBulkDeleting(true);
    const results = await Promise.allSettled(
      selectedRowKeys.map((id) => ExpenseService.remove(String(id))),
    );
    const succeeded = results.filter(
      (result) => result.status === "fulfilled",
    ).length;
    const failed = results.length - succeeded;

    if (failed > 0) {
      messageApi.warning(
        `${succeeded} lançamento(s) excluído(s), ${failed} com erro.`,
      );
    } else {
      messageApi.success(`${succeeded} lançamento(s) excluído(s).`);
    }

    setSelectedRowKeys([]);
    setBulkDeleting(false);
    refresh();
  };

  // Formas de pagamento realmente presentes nos lançamentos, unidas às
  // padrão: planilha importada pode trazer valor fora da lista, e ele
  // precisa ser filtrável do mesmo jeito.
  const paymentMethodOptions = useMemo(() => {
    const values = new Set<string>(PAYMENT_METHODS);
    expenses.forEach((expense) => {
      if (expense.paymentMethod) {
        values.add(expense.paymentMethod);
      }
    });
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((value) => ({ text: value, value }));
  }, [expenses]);

  const columns: TableColumnsType<Expense> = [
    {
      title: "Data",
      dataIndex: "date",
      key: "date",
      sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
      render: (value: string) => formatDate(value),
      ...dateRangeFilter(),
      filteredValue: filters.date ?? null,
      onFilter: (value, record) => matchesDateRange(record.date, value),
    },
    {
      title: "Categoria",
      dataIndex: "categoryId",
      key: "categoryId",
      render: (value: string) => {
        const category = categoryMap.get(value);
        return category ? (
          <Tag color={category.color || "blue"}>{category.name}</Tag>
        ) : (
          "-"
        );
      },
      filters: categories.map((category) => ({
        text: category.name,
        value: category.id,
      })),
      filterSearch: true,
      filteredValue: filters.categoryId ?? null,
      onFilter: (value, record) => record.categoryId === value,
    },
    {
      title: "Fonte",
      dataIndex: "sourceId",
      key: "sourceId",
      render: (value: string) => sourceMap.get(value)?.name || "-",
      filters: sources.map((source) => ({
        text: source.name,
        value: source.id,
      })),
      filterSearch: true,
      filteredValue: filters.sourceId ?? null,
      onFilter: (value, record) => record.sourceId === value,
    },
    {
      title: "Fornecedor",
      dataIndex: "supplier",
      key: "supplier",
      render: (value: string | null) => value || "-",
      ...textFilter("Buscar fornecedor"),
      filteredValue: filters.supplier ?? null,
      onFilter: (value, record) => matchesText(record.supplier, value),
    },
    {
      title: "Forma de pagamento",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      filters: paymentMethodOptions,
      filteredValue: filters.paymentMethod ?? null,
      onFilter: (value, record) => record.paymentMethod === value,
    },
    {
      title: "Valor",
      dataIndex: "amount",
      key: "amount",
      sorter: (a, b) => a.amount - b.amount,
      render: (value: number) => formatCurrency(value),
      ...numberRangeFilter(),
      filteredValue: filters.amount ?? null,
      onFilter: (value, record) => matchesNumberRange(record.amount, value),
    },
    {
      title: "Status",
      key: "status",
      render: (_value: unknown, record: Expense) => (
        <Tag color={record.dataRealizada ? "success" : "processing"}>
          {record.dataRealizada ? "Pago" : "Previsto"}
        </Tag>
      ),
      filters: [
        { text: "Pago", value: "pago" },
        { text: "Previsto", value: "previsto" },
      ],
      filteredValue: filters.status ?? null,
      onFilter: (value, record) =>
        (record.dataRealizada ? "pago" : "previsto") === value,
    },
  ];

  return (
    <section>
      {contextHolder}
      <div style={pageHeaderRowStyle}>
        {isDesktop && (
          <div>
            <h1 style={pageTitleStyle}>Controle</h1>
            <p style={pageDescriptionStyle}>
              Cadastre os lançamentos de gastos da obra.
            </p>
          </div>
        )}
        <Space wrap>
          {canWrite && (
            <>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setFormModalState({ mode: "create" })}
              >
                Novo lançamento
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setImportModalOpen(true)}
              >
                Importar planilha
              </Button>
            </>
          )}
          {/* Exportar é leitura: continua liberado para o fiscal. */}
          <Button
            icon={<DownloadOutlined />}
            onClick={exportXlsx}
            loading={exporting}
          >
            Exportar planilha
          </Button>
        </Space>
      </div>

      <Card title="Histórico de lançamentos" loading={loading}>
        {expenses.length === 0 && !loading ? (
          <Empty description="Nenhum lançamento cadastrado." />
        ) : (
          <>
            {canWrite && selectedRowKeys.length > 0 && (
              <div style={bulkActionBarStyle}>
                <span>{selectedRowKeys.length} selecionado(s)</span>
                <Popconfirm
                  title={`Excluir ${selectedRowKeys.length} lançamento(s)?`}
                  okText="Excluir"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                  onConfirm={bulkDelete}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={bulkDeleting}
                  >
                    Excluir selecionados
                  </Button>
                </Popconfirm>
              </div>
            )}
            {hasFilters && (
              <div style={filterBarStyle}>
                <span>
                  {filteredCount === null
                    ? null
                    : `${plural(filteredCount, "lançamento", "lançamentos")} no filtro`}
                </span>
                <Button size="small" onClick={() => setFilters({})}>
                  Limpar filtros
                </Button>
              </div>
            )}
            <Table
              rowKey="id"
              columns={columns}
              dataSource={expenses}
              scroll={{ x: true }}
              onChange={(_pagination, nextFilters, _sorter, extra) => {
                setFilters(nextFilters);
                setFilteredCount(extra.currentDataSource.length);
              }}
              locale={{
                emptyText: (
                  <Empty description="Nenhum lançamento corresponde aos filtros." />
                ),
              }}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              // Seleção existe só para a exclusão em massa: sem permissão de
              // escrita, as checkboxes não levariam a lugar nenhum.
              rowSelection={
                canWrite
                  ? {
                      selectedRowKeys,
                      onChange: setSelectedRowKeys,
                      preserveSelectedRowKeys: true,
                    }
                  : undefined
              }
              onRow={(record) => ({
                onClick: () => setDetailExpense(record),
                style: { cursor: "pointer" },
              })}
            />
          </>
        )}
      </Card>

      <ExpenseFormModal
        open={formModalState !== null}
        mode={formModalState?.mode ?? "create"}
        expense={
          formModalState?.mode === "edit" ? formModalState.expense : null
        }
        categories={categories}
        sources={sources}
        onClose={() => setFormModalState(null)}
        onCategoriesChange={setCategories}
        onSourcesChange={setSources}
        onSaved={refresh}
      />

      <ExpenseDetailModal
        expense={detailExpense}
        categories={categories}
        sources={sources}
        onClose={() => setDetailExpense(null)}
        onEdit={(expense) => {
          setDetailExpense(null);
          setFormModalState({ mode: "edit", expense });
        }}
        onDeleted={() => {
          setDetailExpense(null);
          refresh();
        }}
      />

      <ImportExpensesModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={refresh}
      />
    </section>
  );
}
