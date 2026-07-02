import { Button, Modal, Popconfirm, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import type { CSSProperties } from "react";
import { ExpenseService } from "../../api/modules/ExpenseService";
import type {
  Expense,
  ExpenseCategory,
  ExpenseSource,
} from "../../api/modules/types";
import { formatCurrency } from "../../utils/format";

const { Text } = Typography;

const rowStyle: CSSProperties = {
  padding: "10px 0",
  borderBottom: "1px solid #E5E7EB",
};

const lastRowStyle: CSSProperties = {
  padding: "10px 0",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 4,
};

const valueStyle: CSSProperties = {
  color: "#102A43",
  fontSize: 15,
};

type Props = {
  expense: Expense | null;
  categories: ExpenseCategory[];
  sources: ExpenseSource[];
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDeleted: () => void;
};

export function ExpenseDetailModal({
  expense,
  categories,
  sources,
  onClose,
  onEdit,
  onDeleted,
}: Props) {
  const [messageApi, contextHolder] = message.useMessage();

  if (!expense) {
    return null;
  }

  const category = categories.find((item) => item.id === expense.categoryId);
  const source = sources.find((item) => item.id === expense.sourceId);

  const remove = async () => {
    try {
      await ExpenseService.remove(expense.id);
      messageApi.success("Lançamento excluído.");
      onDeleted();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao excluir lançamento.",
      );
    }
  };

  return (
    <Modal
      title="Detalhes do lançamento"
      open
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Popconfirm
          key="delete"
          title="Excluir lançamento?"
          okText="Excluir"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
          onConfirm={remove}
        >
          <Button danger>Excluir</Button>
        </Popconfirm>,
        <Button key="edit" type="primary" onClick={() => onEdit(expense)}>
          Editar
        </Button>,
      ]}
    >
      {contextHolder}
      <div style={rowStyle}>
        <Text style={labelStyle} type="secondary">
          Data
        </Text>
        <div style={valueStyle}>{dayjs(expense.date).format("DD/MM/YYYY")}</div>
      </div>
      <div style={rowStyle}>
        <Text style={labelStyle} type="secondary">
          Categoria
        </Text>
        <div style={valueStyle}>
          {category ? (
            <Tag color={category.color || "blue"}>{category.name}</Tag>
          ) : (
            "-"
          )}
        </div>
      </div>
      <div style={rowStyle}>
        <Text style={labelStyle} type="secondary">
          Fonte
        </Text>
        <div style={valueStyle}>{source?.name || "-"}</div>
      </div>
      <div style={rowStyle}>
        <Text style={labelStyle} type="secondary">
          Fornecedor
        </Text>
        <div style={valueStyle}>{expense.supplier || "-"}</div>
      </div>
      <div style={rowStyle}>
        <Text style={labelStyle} type="secondary">
          Forma de pagamento
        </Text>
        <div style={valueStyle}>{expense.paymentMethod}</div>
      </div>
      <div style={rowStyle}>
        <Text style={labelStyle} type="secondary">
          Valor
        </Text>
        <div style={valueStyle}>{formatCurrency(expense.amount)}</div>
      </div>
      <div style={lastRowStyle}>
        <Text style={labelStyle} type="secondary">
          Observações
        </Text>
        <div style={valueStyle}>{expense.notes || "-"}</div>
      </div>
    </Modal>
  );
}
