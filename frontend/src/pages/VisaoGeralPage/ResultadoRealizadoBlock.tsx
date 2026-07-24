import { CheckCircleOutlined } from "@ant-design/icons";
import { theme } from "antd";
import { DetailCard } from "../../components/DetailCard";
import type { DashboardResultadoRealizado } from "../../api/modules/types";
import { plural } from "../../utils/format";
import { usePrivacyFormat } from "../../privacyContext";
import { saldoColor } from "../../utils/thresholds";

type ResultadoRealizadoBlockProps = {
  resultadoRealizado: DashboardResultadoRealizado | null;
  loading: boolean;
};

/**
 * Lucro REALIZADO — só obras CONCLUIDO com valor de fechamento informado,
 * dos DOIS tipos (diferente de `ResultBlock`, que é só obra de cliente em
 * andamento, por percentual de avanço). É o resultado definitivo: a obra
 * terminou, o custo não muda mais. Snapshot — não responde ao seletor de
 * período do Consolidado.
 */
export function ResultadoRealizadoBlock({
  resultadoRealizado,
  loading,
}: ResultadoRealizadoBlockProps) {
  const { token } = theme.useToken();
  const { formatCurrency, formatPercent } = usePrivacyFormat();

  const obrasConcluidas = resultadoRealizado?.obrasConcluidas ?? 0;
  const valorFechamentoTotal = resultadoRealizado?.valorFechamentoTotal ?? 0;
  const custoRealizadoTotal = resultadoRealizado?.custoRealizadoTotal ?? 0;
  const lucroRealizadoTotal = resultadoRealizado?.lucroRealizadoTotal ?? 0;
  const margemPct = resultadoRealizado?.margemPct ?? null;

  return (
    <DetailCard
      icon={<CheckCircleOutlined />}
      title="Lucro realizado"
      sublabel="Obras concluídas"
      loading={loading}
      emptyMessage={
        !loading && obrasConcluidas === 0
          ? "Nenhuma obra concluída ainda."
          : undefined
      }
      stats={[
        {
          label: "Obras",
          value: plural(obrasConcluidas, "obra", "obras"),
          hint: "Obras com status Concluído e valor de fechamento informado, de cliente e próprias.",
        },
        {
          label: "Valor de fechamento",
          value: formatCurrency(valorFechamentoTotal),
          hint: "Soma do valor pelo qual cada obra concluída foi entregue ou vendida.",
        },
        {
          label: "Custo realizado",
          value: formatCurrency(custoRealizadoTotal),
          hint: "Soma de todo o custo gasto nas obras concluídas, do início ao fim.",
        },
        {
          label: "Lucro",
          value: formatCurrency(lucroRealizadoTotal),
          color: saldoColor(lucroRealizadoTotal, token),
          detail: margemPct === null ? null : `margem ${formatPercent(margemPct)}`,
          hint: "Valor de fechamento menos custo realizado total das obras concluídas.",
        },
      ]}
    />
  );
}
