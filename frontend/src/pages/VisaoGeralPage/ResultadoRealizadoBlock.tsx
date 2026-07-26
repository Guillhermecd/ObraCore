import { CheckCircleOutlined } from "@ant-design/icons";
import type { DashboardResultadoRealizado } from "../../api/modules/types";
import { ResultadoDetailBlock } from "./ResultadoDetailBlock";

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
  return (
    <ResultadoDetailBlock
      icon={<CheckCircleOutlined />}
      title="Lucro realizado"
      sublabel="Obras concluídas"
      loading={loading}
      resumo={resultadoRealizado}
      pick={(r) => ({
        count: r.obrasConcluidas,
        primary: r.valorFechamentoTotal,
        secondary: r.custoRealizadoTotal,
        lucro: r.lucroRealizadoTotal,
        margemPct: r.margemPct,
      })}
      emptyMessage="Nenhuma obra concluída ainda."
      countLabel="Obras"
      countNounSingular="obra"
      countNounPlural="obras"
      countHint="Obras com status Concluído e valor de fechamento informado, de cliente e próprias."
      primaryLabel="Valor de fechamento"
      primaryHint="Soma do valor pelo qual cada obra concluída foi entregue ou vendida."
      secondaryLabel="Custo realizado"
      secondaryHint="Soma de todo o custo gasto nas obras concluídas, do início ao fim."
      lucroHint="Valor de fechamento menos custo realizado total das obras concluídas."
    />
  );
}
