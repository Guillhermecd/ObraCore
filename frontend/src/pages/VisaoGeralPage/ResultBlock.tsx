import { AuditOutlined } from "@ant-design/icons";
import { theme } from "antd";
import { DetailCard } from "../../components/DetailCard";
import type { DashboardResultado, PeriodoConsolidado } from "../../api/modules/types";
import { plural } from "../../utils/format";
import { usePrivacyFormat } from "../../privacyContext";
import { saldoColor } from "../../utils/thresholds";

const PERIODO_SUBLABEL: Record<PeriodoConsolidado, string> = {
  mes: "Reconhecido no mês",
  tri: "Reconhecido no trimestre",
  ano: "Reconhecido no ano",
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
  const { token } = theme.useToken();
  const { formatCurrency, formatPercent } = usePrivacyFormat();

  const contratosAtivos = resultado?.contratosAtivos ?? 0;
  const receitaReconhecida = resultado?.receitaReconhecida ?? 0;
  const custoRealizado = resultado?.custoRealizado ?? 0;
  const lucroReconhecido = resultado?.lucroReconhecido ?? 0;
  const margemPct = resultado?.margemPct ?? null;
  const margemPrevistaPct = resultado?.margemPrevistaPct ?? null;

  return (
    <DetailCard
      icon={<AuditOutlined />}
      title="Resultado"
      sublabel={PERIODO_SUBLABEL[periodo]}
      loading={loading}
      emptyMessage={
        !loading && contratosAtivos === 0
          ? "Nenhuma obra de cliente com contrato informado no período. Só obra de cliente compõe o resultado."
          : undefined
      }
      footnote={
        margemPrevistaPct !== null && (
          <>Margem prevista na conclusão: {formatPercent(margemPrevistaPct)}.</>
        )
      }
      stats={[
        {
          label: "Contratos ativos",
          value: plural(contratosAtivos, "contrato", "contratos"),
          hint: "Obras de cliente com contrato informado, ativas no período selecionado.",
        },
        {
          label: "Receita",
          value: formatCurrency(receitaReconhecida),
          hint: "Receita reconhecida no período, pelo percentual de avanço da obra (custo realizado ÷ orçamento) aplicado ao valor do contrato.",
        },
        {
          label: "Custo",
          value: formatCurrency(custoRealizado),
          hint: "Custo realizado no período, somando os lançamentos de saída das obras de cliente.",
        },
        {
          label: "Lucro",
          value: formatCurrency(lucroReconhecido),
          color: saldoColor(lucroReconhecido, token),
          detail: margemPct === null ? null : `margem ${formatPercent(margemPct)}`,
          hint: "Receita reconhecida menos custo realizado no período.",
        },
      ]}
    />
  );
}
