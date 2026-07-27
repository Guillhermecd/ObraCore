import { Button, Form, Input, InputNumber, Modal, Select, message } from "antd";
import { Controller, useForm, useWatch } from "react-hook-form";
import { GroupService } from "../../api/modules/GroupService";
import type { Group, TipoObra } from "../../api/modules/types";
import { getErrorMessage } from "../../utils/errors";
import { TIPO_OBRA_LABEL, valorEsperadoLabel } from "../../utils/obra";

type CreateGroupForm = {
  name: string;
  description: string;
  plannedSpending: number;
  tipoObra: TipoObra;
  valorContrato: number | null;
  valorVendaEsperada: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (group: Group) => void;
};

export function CreateGroupModal({ open, onClose, onCreated }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupForm>({
    defaultValues: {
      name: "",
      description: "",
      plannedSpending: 0,
      tipoObra: "PROPRIA",
      valorContrato: null,
      valorVendaEsperada: null,
    },
  });

  const tipoObra = useWatch({ control, name: "tipoObra" });
  const isCliente = tipoObra === "CLIENTE";

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (values: CreateGroupForm) => {
    try {
      const response = await GroupService.create({
        name: values.name,
        description: values.description.trim() || undefined,
        plannedSpending: values.plannedSpending,
        tipoObra: values.tipoObra,
        valorContrato: values.tipoObra === "CLIENTE" ? values.valorContrato : null,
        valorVendaEsperada: values.tipoObra === "PROPRIA" ? values.valorVendaEsperada : null,
      });
      messageApi.success("Grupo criado.");
      onCreated(response.group);
      close();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Erro ao criar grupo."));
    }
  };

  return (
    <Modal
      title="Novo grupo"
      open={open}
      onCancel={close}
      footer={null}
      destroyOnHidden
    >
      {contextHolder}
      <Form layout="vertical" onFinish={handleSubmit(submit)}>
        <Controller
          name="name"
          control={control}
          rules={{ required: "Informe o nome do grupo." }}
          render={({ field }) => (
            <Form.Item
              label="Nome"
              validateStatus={errors.name ? "error" : undefined}
              help={errors.name?.message}
            >
              <Input
                {...field}
                autoFocus
                placeholder="Ex.: Obra Jardim das Flores"
              />
            </Form.Item>
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Form.Item label="Descrição">
              <Input.TextArea {...field} rows={3} placeholder="Opcional" />
            </Form.Item>
          )}
        />
        <Controller
          name="tipoObra"
          control={control}
          render={({ field }) => (
            <Form.Item
              label="Tipo de obra"
              help="Obra de cliente tem contrato, receita e lucro reconhecidos. Obra própria é financiada por aporte de capital, mas também pode ter um valor de venda esperado, pra estimar lucro."
            >
              <Select
                {...field}
                options={[
                  { value: "PROPRIA", label: TIPO_OBRA_LABEL.PROPRIA },
                  { value: "CLIENTE", label: TIPO_OBRA_LABEL.CLIENTE },
                ]}
              />
            </Form.Item>
          )}
        />
        {isCliente ? (
          <Controller
            name="valorContrato"
            control={control}
            render={({ field }) => (
              <Form.Item label={valorEsperadoLabel("CLIENTE")}>
                <InputNumber
                  {...field}
                  value={field.value ?? undefined}
                  onChange={(value) => field.onChange(value ?? null)}
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                  precision={2}
                  decimalSeparator=","
                  prefix="R$"
                  placeholder="Pode ser informado depois"
                />
              </Form.Item>
            )}
          />
        ) : (
          <Controller
            name="valorVendaEsperada"
            control={control}
            render={({ field }) => (
              <Form.Item
                label={valorEsperadoLabel("PROPRIA")}
                help="Opcional. Informado, já dá uma previsão de lucro (venda esperada − orçamento) desde já."
              >
                <InputNumber
                  {...field}
                  value={field.value ?? undefined}
                  onChange={(value) => field.onChange(value ?? null)}
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                  precision={2}
                  decimalSeparator=","
                  prefix="R$"
                  placeholder="Pode ser informado depois"
                />
              </Form.Item>
            )}
          />
        )}
        <Controller
          name="plannedSpending"
          control={control}
          render={({ field }) => (
            <Form.Item label="Gasto planejado">
              <InputNumber
                {...field}
                onChange={(value) => field.onChange(value ?? 0)}
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
        <Button type="primary" htmlType="submit" block loading={isSubmitting}>
          Criar grupo
        </Button>
      </Form>
    </Modal>
  );
}
