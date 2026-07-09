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
  Popconfirm,
  Space,
  Table,
  Tag,
  message,
  theme,
  type TableColumnsType,
} from "antd";
import dayjs from "dayjs";
import type { CSSProperties, Key } from "react";
import { useState } from "react";
import { ExpenseService } from "../../api/modules/ExpenseService";
import type { Expense } from "../../api/modules/types";
import { useExpenseData } from "../../api/modules/useExpenseData";
import { PageHeader } from "../../components/PageHeader";
import { useActiveGroup } from "../../layouts/groupContext";
import { usePrivateMobileHeader } from "../../layouts/privateMobileHeader";
import { getErrorMessage } from "../../utils/errors";
import { formatCurrency } from "../../utils/format";
import { ExpenseDetailModal } from "./ExpenseDetailModal";
import { ExpenseFormModal } from "./ExpenseFormModal";
import { ImportExpensesModal } from "./ImportExpensesModal";

type FormModalState =
  | { mode: "create" }
  | { mode: "edit"; expense: Expense }
  | null;

export function ControlePage() {
  const { token } = theme.useToken();
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

  usePrivateMobileHeader("Controle");
  const [messageApi, contextHolder] = message.useMessage();
  const { activeGroupId } = useActiveGroup();

  const [formModalState, setFormModalState] = useState<FormModalState>(null);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const {
    categories,
    sources,
    expenses,
    categoryMap,
    sourceMap,
    loading,
    reload: refresh,
    setCategories,
    setSources,
  } = useExpenseData(activeGroupId, (errorMessage) =>
    messageApi.error(errorMessage),
  );

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
      <PageHeader
        title="Controle"
        description="Cadastre os lançamentos de gastos da obra."
        actions={
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
            <Button
              icon={<DownloadOutlined />}
              onClick={exportXlsx}
              loading={exporting}
            >
              Exportar planilha
            </Button>
          </Space>
        }
      />

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
