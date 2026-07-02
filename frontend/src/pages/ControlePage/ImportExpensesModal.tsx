import { InboxOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Modal,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
  type TableColumnsType,
  type UploadProps,
} from "antd";
import dayjs from "dayjs";
import type { CSSProperties } from "react";
import { useState } from "react";
import { ExpenseService } from "../../api/modules/ExpenseService";
import type {
  ExpenseImportPreviewResponse,
  ExpenseImportRow,
} from "../../api/modules/types";
import { formatCurrency } from "../../utils/format";

const { Dragger } = Upload;
const { Paragraph } = Typography;

// Cabeçalho canônico — mantenha em sincronia com os aliases de
// backend/api/services/ExpenseImportService.js (HEADER_ALIASES).
const TEMPLATE_HEADERS = [
  "Data",
  "Categoria",
  "Fonte",
  "Fornecedor",
  "Forma de pagamento",
  "Valor",
  "Observações",
];
const TEMPLATE_EXAMPLE_ROW = [
  "01/07/2026",
  "Material elétrico",
  "Conta corrente",
  "Fornecedor Exemplo",
  "PIX",
  "150,00",
  "Compra de fiação",
];

const hintStyle: CSSProperties = {
  color: "#627D98",
};

const previewFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
};

function downloadTemplate() {
  const csvLines = [TEMPLATE_HEADERS.join(";"), TEMPLATE_EXAMPLE_ROW.join(";")];
  const blob = new Blob([csvLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "modelo-lancamentos.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type Step = "upload" | "preview";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

export function ImportExpensesModal({ open, onClose, onImported }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExpenseImportPreviewResponse | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setUploading(false);
    setCommitting(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const backToUpload = () => {
    setStep("upload");
    setFile(null);
    setPreview(null);
  };

  const handleFileSelected: UploadProps["beforeUpload"] = (selectedFile) => {
    setUploading(true);
    ExpenseService.importPreview(selectedFile)
      .then((response) => {
        setFile(selectedFile);
        setPreview(response);
        setStep("preview");
      })
      .catch((error: unknown) => {
        messageApi.error(
          error instanceof Error ? error.message : "Erro ao ler o arquivo.",
        );
      })
      .finally(() => setUploading(false));
    return false;
  };

  const confirmImport = async () => {
    if (!file) {
      return;
    }

    setCommitting(true);
    try {
      const result = await ExpenseService.importCommit(file);
      if (result.failed.length > 0) {
        messageApi.warning(
          `${result.imported} lançamento(s) importado(s), ${result.failed.length} linha(s) com erro.`,
        );
      } else {
        messageApi.success(`${result.imported} lançamento(s) importado(s).`);
      }
      onImported();
      close();
    } catch (error) {
      messageApi.error(
        error instanceof Error
          ? error.message
          : "Erro ao importar lançamentos.",
      );
    } finally {
      setCommitting(false);
    }
  };

  const columns: TableColumnsType<ExpenseImportRow> = [
    { title: "Linha", dataIndex: "rowNumber", key: "rowNumber", width: 70 },
    {
      title: "Status",
      key: "status",
      width: 90,
      render: (_, row) =>
        row.valid ? (
          <Tag color="green">OK</Tag>
        ) : (
          <Tooltip title={row.errors.join(" ")}>
            <Tag color="red">Erro</Tag>
          </Tooltip>
        ),
    },
    {
      title: "Data",
      dataIndex: "date",
      key: "date",
      render: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Categoria",
      key: "categoryName",
      render: (_, row) => (
        <span>
          {row.categoryName || "-"}
          {row.categoryIsNew && (
            <Tag color="blue" style={{ marginLeft: 6 }}>
              nova
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: "Fonte",
      key: "sourceName",
      render: (_, row) => (
        <span>
          {row.sourceName || "-"}
          {row.sourceIsNew && (
            <Tag color="blue" style={{ marginLeft: 6 }}>
              nova
            </Tag>
          )}
        </span>
      ),
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
      render: (value: string | null) => value || "-",
    },
    {
      title: "Valor",
      dataIndex: "amount",
      key: "amount",
      render: (value: number | null) =>
        value !== null ? formatCurrency(value) : "-",
    },
    {
      title: "Observações",
      dataIndex: "notes",
      key: "notes",
      render: (value: string | null) => value || "-",
    },
  ];

  return (
    <Modal
      title="Importar lançamentos"
      open={open}
      onCancel={close}
      footer={null}
      destroyOnHidden
      width={step === "preview" ? 960 : 520}
    >
      {contextHolder}
      {step === "upload" ? (
        <>
          <Paragraph type="secondary">
            Envie uma planilha .csv ou .xlsx com os lançamentos. As colunas
            esperadas são: Data, Categoria, Fonte, Fornecedor, Forma de
            pagamento, Valor e Observações. Categorias e fontes novas informadas
            na planilha são criadas automaticamente.
          </Paragraph>
          <Button
            type="link"
            onClick={downloadTemplate}
            style={{ paddingLeft: 0, marginBottom: 12 }}
          >
            Baixar modelo
          </Button>
          <Dragger
            accept=".csv,.xlsx"
            multiple={false}
            maxCount={1}
            showUploadList={false}
            beforeUpload={handleFileSelected}
            disabled={uploading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p>Clique ou arraste o arquivo aqui</p>
            <p style={hintStyle}>Suporta .csv e .xlsx</p>
          </Dragger>
          {uploading && (
            <div style={{ marginTop: 12 }}>Processando arquivo...</div>
          )}
        </>
      ) : (
        preview && (
          <>
            <Alert
              style={{ marginBottom: 16 }}
              type={preview.summary.invalid > 0 ? "warning" : "success"}
              showIcon
              message={`${preview.summary.valid} de ${preview.summary.total} linha(s) válida(s)${
                preview.summary.invalid > 0
                  ? `, ${preview.summary.invalid} com erro`
                  : ""
              }.`}
            />
            <Table
              rowKey="rowNumber"
              columns={columns}
              dataSource={preview.rows}
              size="small"
              scroll={{ x: true, y: 320 }}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              style={{ marginBottom: 16 }}
            />
            <div style={previewFooterStyle}>
              <Button onClick={backToUpload}>Escolher outro arquivo</Button>
              <Button
                type="primary"
                onClick={confirmImport}
                loading={committing}
                disabled={preview.summary.valid === 0}
              >
                Confirmar importação
              </Button>
            </div>
          </>
        )
      )}
    </Modal>
  );
}
