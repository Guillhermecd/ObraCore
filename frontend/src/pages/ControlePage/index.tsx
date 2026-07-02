import {
  DeleteOutlined,
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
  type TableColumnsType,
} from "antd";
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
import { usePrivateMobileHeader } from "../../layouts/privateMobileHeader";
import { formatCurrency } from "../../utils/format";
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

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: "#102A43",
  fontSize: 26,
};

const pageDescriptionStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "#627D98",
};

const bulkActionBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
  padding: "8px 12px",
  background: "#F4F6F8",
  borderRadius: 8,
};

export function ControlePage() {
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.md);
  usePrivateMobileHeader("Controle");
  const [messageApi, contextHolder] = message.useMessage();

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
  }, [messageApi, refreshKey]);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const sourceMap = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );

  const refresh = () => setRefreshKey((key) => key + 1);

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

  const columns: TableColumnsType<Expense> = [
    {
      title: "Data",
      dataIndex: "date",
      key: "date",
      sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
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
    },
    {
      title: "Fonte",
      dataIndex: "sourceId",
      key: "sourceId",
      render: (value: string) => sourceMap.get(value)?.name || "-",
    },
    {
      title: "Fornecedor",
      dataIndex: "supplier",
      key: "supplier",
      render: (value: string | null) => value || "-",
    },
    {
      title: "Forma de pagamento",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
    },
    {
      title: "Valor",
      dataIndex: "amount",
      key: "amount",
      sorter: (a, b) => a.amount - b.amount,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Observações",
      dataIndex: "notes",
      key: "notes",
      render: (value: string | null) => value || "-",
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
        </Space>
      </div>

      <Card title="Histórico de lançamentos" loading={loading}>
        {expenses.length === 0 && !loading ? (
          <Empty description="Nenhum lançamento cadastrado." />
        ) : (
          <>
            {selectedRowKeys.length > 0 && (
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
            <Table
              rowKey="id"
              columns={columns}
              dataSource={expenses}
              scroll={{ x: true }}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                preserveSelectedRowKeys: true,
              }}
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
