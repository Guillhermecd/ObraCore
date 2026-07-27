import { AuditOutlined } from "@ant-design/icons";
import type { DashboardResultado, PeriodoConsolidado } from "../../api/modules/types";
import { usePrivacyFormat } from "../../privacyContext";
import { ResultadoDetailBlock } from "./ResultadoDetailBlock";

const PERIODO_SUBLABEL: Record<PeriodoConsolidado, string> = {
  mes: "Reconhecido no mês",
  tri: "Reconhecido no trimestre",
  ano: "Reconhecido no ano",
  tudo: "Reconhecido no total",
};

type ResultBlockProps = {
  resultado: DashboardResultado | null;
  periodo: PeriodoConsolidado;
  loading: boolean;
};

/**
 * Resultado é alimentado só por obra de cliente: obra própria não gera
 * receita — o dinheiro que entra nela é aporte do próprio dono, e somá-la aqui
 * inventaria lucro. Único bloco de resultado que responde ao seletor de
 * período do Consolidado (Mês/Trimestre/Ano) — os outros dois (projetado,
 * realizado) são snapshot/acumulados.
 */
export function ResultBlock({ resultado, periodo, loading }: ResultBlockProps) {
  const { formatPercent } = usePrivacyFormat();
  const margemPrevistaPct = resultado?.margemPrevistaPct ?? null;

  return (
    <ResultadoDetailBlock
      icon={<AuditOutlined />}
      title="Resultado"
      sublabel={PERIODO_SUBLABEL[periodo]}
      loading={loading}
      resumo={resultado}
      pick={(r) => ({
        count: r.contratosAtivos,
        primary: r.receitaReconhecida,
        secondary: r.custoRealizado,
        lucro: r.lucroReconhecido,
        margemPct: r.margemPct,
      })}
      emptyMessage="Nenhuma obra de cliente com contrato informado no período. Só obra de cliente compõe o resultado."
      footnote={
        margemPrevistaPct !== null && (
          <>Margem prevista na conclusão: {formatPercent(margemPrevistaPct)}.</>
        )
      }
      countLabel="Contratos ativos"
      countNounSingular="contrato"
      countNounPlural="contratos"
      countHint="Obras de cliente com contrato informado, ativas no período selecionado."
      primaryLabel="Receita"
      primaryHint="Receita reconhecida no período, pelo percentual de avanço da obra (custo realizado ÷ orçamento) aplicado ao valor do contrato."
      secondaryLabel="Custo"
      secondaryHint="Custo realizado no período, somando os lançamentos de saída das obras de cliente."
      lucroHint="Receita reconhecida menos custo realizado no período."
    />
  );
}
