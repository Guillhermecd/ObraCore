import { theme } from "antd";
import { Kpi } from "../../components/Kpi";
import { kpiGridStyle } from "../../components/layout";
import { SectionBlock } from "../../components/SectionBlock";
import type { DashboardResultado } from "../../api/modules/types";
import { plural } from "../../utils/format";
import { usePrivacyFormat } from "../../privacyContext";
import { saldoColor } from "../../utils/thresholds";

type ResultBlockProps = {
  resultado: DashboardResultado | null;
  loading: boolean;
};

/**
 * Resultado é alimentado só por obra de cliente: obra própria não gera
 * receita — o dinheiro que entra nela é aporte do próprio dono, e somá-la aqui
 * inventaria lucro. Isso fica escrito na tela, não só no código.
 */
export function ResultBlock({ resultado, loading }: ResultBlockProps) {
  const { token } = theme.useToken();
  const { formatCurrency, formatPercent } = usePrivacyFormat();

  const contratosAtivos = resultado?.contratosAtivos ?? 0;
  const receitaReconhecida = resultado?.receitaReconhecida ?? 0;
  const custoRealizado = resultado?.custoRealizado ?? 0;
  const lucroReconhecido = resultado?.lucroReconhecido ?? 0;
  const margemPct = resultado?.margemPct ?? null;
  const margemPrevistaPct = resultado?.margemPrevistaPct ?? null;

  if (!loading && contratosAtivos === 0) {
    return (
      <SectionBlock title="Resultado" scope="acumulado">
        <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
          Nenhuma obra de cliente com contrato informado. Só obra de cliente
          compõe o resultado.
        </div>
      </SectionBlock>
    );
  }

  return (
    <SectionBlock
      title="Resultado"
      scope="acumulado"
      footnote={
        <>
          {margemPrevistaPct !== null && (
            <>
              Margem prevista na conclusão: {formatPercent(margemPrevistaPct)}
              .{" "}
            </>
          )}
          Obras próprias não compõem o resultado — o dinheiro que entra nelas é
          aporte de capital, não receita.
        </>
      }
    >
      <div style={kpiGridStyle}>
        <Kpi
          loading={loading}
          label="Contratos ativos"
          value={plural(contratosAtivos, "contrato", "contratos")}
          hint="Número de obras de cliente com valor de contrato informado."
        />
        <Kpi
          loading={loading}
          label="Receita reconhecida"
          value={formatCurrency(receitaReconhecida)}
          hint="Valor do contrato × avanço da obra, medido por custo sobre custo (custo realizado ÷ orçamento)."
        />
        <Kpi
          loading={loading}
          label="Custo realizado"
          value={formatCurrency(custoRealizado)}
          hint="Soma das saídas já realizadas nas obras de cliente com contrato informado."
        />
        <Kpi
          loading={loading}
          label="Lucro reconhecido"
          value={formatCurrency(lucroReconhecido)}
          color={saldoColor(lucroReconhecido, token)}
          hint="Receita reconhecida menos custo realizado. Margem = lucro reconhecido ÷ receita reconhecida."
          detail={
            margemPct === null ? null : `Margem de ${formatPercent(margemPct)}`
          }
        />
      </div>
    </SectionBlock>
  );
}
