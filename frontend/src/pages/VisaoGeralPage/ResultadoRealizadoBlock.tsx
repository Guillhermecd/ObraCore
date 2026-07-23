import { theme } from "antd";
import { Kpi } from "../../components/Kpi";
import { kpiGridStyle } from "../../components/layout";
import { SectionBlock } from "../../components/SectionBlock";
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
 * terminou, o custo não muda mais.
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

  if (!loading && obrasConcluidas === 0) {
    return null;
  }

  return (
    <SectionBlock
      title="Lucro realizado — obras concluídas"
      scope="acumulado"
      footnote="Valor de fechamento menos custo gasto, das obras já concluídas. Definitivo — diferente do lucro reconhecido por avanço, que é só das obras de cliente em andamento."
    >
      <div style={kpiGridStyle}>
        <Kpi
          loading={loading}
          label="Obras concluídas"
          value={plural(obrasConcluidas, "obra", "obras")}
          hint="Número de obras marcadas como concluídas com valor de fechamento informado."
        />
        <Kpi
          loading={loading}
          label="Valor de fechamento"
          value={formatCurrency(valorFechamentoTotal)}
          hint="Soma do valor pelo qual cada obra concluída foi entregue ou vendida."
        />
        <Kpi
          loading={loading}
          label="Custo realizado"
          value={formatCurrency(custoRealizadoTotal)}
          hint="Soma das saídas já realizadas nas obras concluídas."
        />
        <Kpi
          loading={loading}
          label="Lucro realizado"
          value={formatCurrency(lucroRealizadoTotal)}
          color={saldoColor(lucroRealizadoTotal, token)}
          hint="Valor de fechamento menos custo realizado. Margem = lucro realizado ÷ valor de fechamento."
          detail={
            margemPct === null ? null : `Margem de ${formatPercent(margemPct)}`
          }
        />
      </div>
    </SectionBlock>
  );
}
