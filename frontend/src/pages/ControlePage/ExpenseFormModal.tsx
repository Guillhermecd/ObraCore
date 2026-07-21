import {
  PaperClipOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Switch,
  Upload,
  message,
  type UploadProps,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState, type CSSProperties } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { CreateExpensePayload } from "../../api/modules/ExpenseService";
import { ExpenseService } from "../../api/modules/ExpenseService";
import { PAYMENT_METHODS } from "../../api/modules/types";
import type {
  Expense,
  ExpenseCategory,
  ExpenseSource,
  ExpenseTipo,
  PaymentMethod,
} from "../../api/modules/types";
import { CreateCategoryModal } from "./CreateCategoryModal";
import { CreateSourceModal } from "./CreateSourceModal";

type ExpenseForm = {
  tipo: ExpenseTipo;
  date: Dayjs;
  categoryId: string | undefined;
  sourceId: string | undefined;
  supplier: string;
  paymentMethod: PaymentMethod | undefined;
  amount: number | null;
  notes: string;
  realizado: boolean;
};

const fieldsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "0 16px",
};

const selectRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
};

const attachmentRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

function emptyFormValues(): ExpenseForm {
  return {
    tipo: "SAIDA",
    date: dayjs(),
    categoryId: undefined,
    sourceId: undefined,
    supplier: "",
    paymentMethod: undefined,
    amount: null,
    notes: "",
    realizado: true,
  };
}

function valuesFromExpense(expense: Expense): ExpenseForm {
  return {
    tipo: expense.tipo ?? "SAIDA",
    date: dayjs(expense.date),
    categoryId: expense.categoryId,
    sourceId: expense.sourceId,
    supplier: expense.supplier || "",
    paymentMethod: expense.paymentMethod,
    amount: expense.amount,
    notes: expense.notes || "",
    realizado: Boolean(expense.dataRealizada),
  };
}

type Props = {
  open: boolean;
  mode: "create" | "edit";
  expense?: Expense | null;
  categories: ExpenseCategory[];
  sources: ExpenseSource[];
  onClose: () => void;
  onCategoriesChange: (categories: ExpenseCategory[]) => void;
  onSourcesChange: (sources: ExpenseSource[]) => void;
  onSaved: () => void;
};

export function ExpenseFormModal({
  open,
  mode,
  expense,
  categories,
  sources,
  onClose,
  onCategoriesChange,
  onSourcesChange,
  onSaved,
}: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseForm>({ defaultValues: emptyFormValues() });

  const tipo = useWatch({ control, name: "tipo" });
  const categoriesForTipo = categories.filter(
    (category) => category.tipo === tipo || category.tipo === "AMBOS",
  );
  const sourcesForTipo = sources.filter(
    (source) => source.tipo === tipo || source.tipo === "AMBOS",
  );

  useEffect(() => {
    if (open) {
      reset(
        mode === "edit" && expense
          ? valuesFromExpense(expense)
          : emptyFormValues(),
      );
    }
  }, [open, mode, expense, reset]);

  const handleTipoChange = (value: ExpenseTipo) => {
    setValue("tipo", value);

    const currentCategory = categories.find((c) => c.id === getValues("categoryId"));
    if (currentCategory && currentCategory.tipo !== value && currentCategory.tipo !== "AMBOS") {
      setValue("categoryId", undefined);
    }

    const currentSource = sources.find((s) => s.id === getValues("sourceId"));
    if (currentSource && currentSource.tipo !== value && currentSource.tipo !== "AMBOS") {
      setValue("sourceId", undefined);
    }
  };

  const close = () => {
    setComprovanteFile(null);
    onClose();
  };

  const submit = async (values: ExpenseForm) => {
    if (
      !values.categoryId ||
      !values.sourceId ||
      !values.paymentMethod ||
      values.amount === null
    ) {
      messageApi.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const isoDate = values.date.toISOString();
    const payload: CreateExpensePayload = {
      date: isoDate,
      categoryId: values.categoryId,
      sourceId: values.sourceId,
      supplier: values.supplier || undefined,
      paymentMethod: values.paymentMethod,
      amount: values.amount,
      notes: values.notes || undefined,
      tipo: values.tipo,
      dataPrevista: isoDate,
      dataRealizada: values.realizado ? isoDate : null,
    };

    try {
      let expenseId: string;
      if (mode === "edit" && expense) {
        await ExpenseService.update(expense.id, payload);
        expenseId = expense.id;
        messageApi.success("Lançamento atualizado.");
      } else {
        const { expense: created } = await ExpenseService.create(payload);
        expenseId = created.id;
        messageApi.success("Lançamento cadastrado.");
      }

      if (comprovanteFile) {
        try {
          await ExpenseService.uploadComprovante(expenseId, comprovanteFile);
        } catch (error) {
          messageApi.error(
            error instanceof Error
              ? error.message
              : "Erro ao anexar comprovante.",
          );
        }
      }

      onSaved();
      close();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Erro ao salvar lançamento.",
      );
    }
  };

  const handleComprovanteSelected: UploadProps["beforeUpload"] = (
    selectedFile,
  ) => {
    setComprovanteFile(selectedFile);
    return false;
  };

  return (
    <>
      <Modal
        title={mode === "edit" ? "Editar lançamento" : "Novo lançamento"}
        open={open}
        onCancel={close}
        footer={null}
        destroyOnHidden
        width={720}
      >
        {contextHolder}
        <Form layout="vertical" onFinish={handleSubmit(submit)}>
          <Controller
            name="tipo"
            control={control}
            render={({ field }) => (
              <Form.Item label="Tipo">
                <Segmented
                  value={field.value}
                  onChange={(value) => handleTipoChange(value as ExpenseTipo)}
                  options={[
                    { label: "Saída", value: "SAIDA" },
                    { label: "Entrada", value: "ENTRADA" },
                  ]}
                />
              </Form.Item>
            )}
          />

          <div style={fieldsGridStyle}>
            <Controller
              name="date"
              control={control}
              rules={{ required: "Informe a data." }}
              render={({ field }) => (
                <Form.Item
                  label="Data"
                  validateStatus={errors.date ? "error" : undefined}
                  help={errors.date?.message}
                >
                  <DatePicker
                    {...field}
                    style={{ width: "100%" }}
                    format="DD/MM/YYYY"
                  />
                </Form.Item>
              )}
            />

            <Controller
              name="realizado"
              control={control}
              render={({ field }) => (
                <Form.Item label={tipo === "ENTRADA" ? "Já recebido?" : "Já pago?"}>
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    checkedChildren="Realizado"
                    unCheckedChildren="Previsto"
                  />
                </Form.Item>
              )}
            />

            <Controller
              name="categoryId"
              control={control}
              rules={{ required: "Selecione a categoria." }}
              render={({ field }) => (
                <Form.Item
                  label="Categoria"
                  validateStatus={errors.categoryId ? "error" : undefined}
                  help={errors.categoryId?.message}
                >
                  <div style={selectRowStyle}>
                    <Select
                      {...field}
                      placeholder="Selecione a categoria"
                      options={categoriesForTipo.map((category) => ({
                        value: category.id,
                        label: category.name,
                      }))}
                      style={{ flex: 1 }}
                    />
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => setCategoryModalOpen(true)}
                      aria-label="Nova categoria"
                    />
                  </div>
                </Form.Item>
              )}
            />

            <Controller
              name="sourceId"
              control={control}
              rules={{ required: "Selecione a fonte." }}
              render={({ field }) => (
                <Form.Item
                  label="Fonte"
                  validateStatus={errors.sourceId ? "error" : undefined}
                  help={errors.sourceId?.message}
                >
                  <div style={selectRowStyle}>
                    <Select
                      {...field}
                      placeholder="Selecione a fonte"
                      options={sourcesForTipo.map((source) => ({
                        value: source.id,
                        label: source.name,
                      }))}
                      style={{ flex: 1 }}
                    />
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => setSourceModalOpen(true)}
                      aria-label="Nova fonte"
                    />
                  </div>
                </Form.Item>
              )}
            />

            <Controller
              name="supplier"
              control={control}
              render={({ field }) => (
                <Form.Item label="Fornecedor">
                  <Input {...field} placeholder="Nome do fornecedor" />
                </Form.Item>
              )}
            />

            <Controller
              name="paymentMethod"
              control={control}
              rules={{ required: "Selecione a forma de pagamento." }}
              render={({ field }) => (
                <Form.Item
                  label="Forma de pagamento"
                  validateStatus={errors.paymentMethod ? "error" : undefined}
                  help={errors.paymentMethod?.message}
                >
                  <Select
                    {...field}
                    placeholder="Selecione a forma de pagamento"
                    options={PAYMENT_METHODS.map((method) => ({
                      value: method,
                      label: method,
                    }))}
                  />
                </Form.Item>
              )}
            />

            <Controller
              name="amount"
              control={control}
              rules={{
                required: "Informe o valor.",
                min: { value: 0.01, message: "Valor deve ser maior que zero." },
              }}
              render={({ field }) => (
                <Form.Item
                  label="Valor"
                  validateStatus={errors.amount ? "error" : undefined}
                  help={errors.amount?.message}
                >
                  <InputNumber
                    {...field}
                    style={{ width: "100%" }}
                    min={0}
                    step={0.01}
                    precision={2}
                    decimalSeparator=","
                    prefix="R$"
                  />
                </Form.Item>
              )}
            />
          </div>

          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <Form.Item label="Observações">
                <Input.TextArea
                  {...field}
                  rows={2}
                  placeholder="Observações adicionais"
                />
              </Form.Item>
            )}
          />

          <Form.Item label="Comprovante">
            <div style={attachmentRowStyle}>
              <Upload
                accept=".pdf,.jpg,.jpeg,.png"
                maxCount={1}
                showUploadList={false}
                beforeUpload={handleComprovanteSelected}
              >
                <Button icon={<PaperClipOutlined />}>
                  {comprovanteFile ? "Trocar arquivo" : "Anexar comprovante"}
                </Button>
              </Upload>
              {comprovanteFile && (
                <>
                  <span>{comprovanteFile.name}</span>
                  <Button
                    type="text"
                    danger
                    onClick={() => setComprovanteFile(null)}
                  >
                    Remover
                  </Button>
                </>
              )}
              {!comprovanteFile && mode === "edit" && expense?.comprovante?.url && (
                <a
                  href={expense.comprovante.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <UploadOutlined /> Ver comprovante atual
                </a>
              )}
            </div>
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={isSubmitting} block>
            {mode === "edit" ? "Salvar alterações" : "Cadastrar lançamento"}
          </Button>
        </Form>
      </Modal>

      <CreateCategoryModal
        open={categoryModalOpen}
        tipo={tipo ?? "SAIDA"}
        onClose={() => setCategoryModalOpen(false)}
        onCreated={(category) => {
          onCategoriesChange(
            [...categories, category].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          setValue("categoryId", category.id);
        }}
      />
      <CreateSourceModal
        open={sourceModalOpen}
        tipo={tipo ?? "SAIDA"}
        onClose={() => setSourceModalOpen(false)}
        onCreated={(source) => {
          onSourcesChange(
            [...sources, source].sort((a, b) => a.name.localeCompare(b.name)),
          );
          setValue("sourceId", source.id);
        }}
      />
    </>
  );
}
