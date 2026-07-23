import { Card, Progress, Skeleton, theme } from "antd";
import { Kpi } from "../../components/Kpi";
import { kpiGridStyle } from "../../components/layout";
import { SectionBlock } from "../../components/SectionBlock";
import type { DashboardSummaryResponse } from "../../api/modules/types";
import { usePrivacyFormat } from "../../privacyContext";
import { coberturaColor, saldoColor } from "../../utils/thresholds";

type ExecutiveSummaryProps = {
  summary: DashboardSummaryResponse | null;
  loading: boolean;
};

const COBERTURA_HINT =
  "Cobertura de caixa = saldo total de todas as obras ÷ soma do orçamento que ainda resta a executar. Acima de 100% o caixa cobre tudo que falta; abaixo disso falta dinheiro para terminar.";

export function ExecutiveSummary({ summary, loading }: ExecutiveSummaryProps) {
  const { token } = theme.useToken();
  const { formatCurrency, formatPercent } = usePrivacyFormat();

  const saldoTotal = summary?.saldoTotal ?? 0;
  const caixaComprometido = summary?.caixaComprometido ?? 0;
  const caixaLivre = summary?.caixaLivre ?? 0;
  const aporteTotalAFazer = summary?.aporteTotalAFazer ?? 0;
  const coberturaCaixaPct = summary?.coberturaCaixaPct ?? null;

  return (
    <SectionBlock title="Caixa" scope="acumulado">
      <div style={kpiGridStyle}>
        <Kpi
          loading={loading}
          label="Saldo total"
          value={formatCurrency(saldoTotal)}
          color={saldoColor(saldoTotal, token)}
          hint="Soma do caixa (entradas menos saídas realizadas) de todas as obras."
          emphasis
        />
        <Kpi
          loading={loading}
          label="Comprometido com obra a executar"
          value={formatCurrency(caixaComprometido)}
          hint="Parte do caixa de cada obra que já está reservada para o orçamento que falta executar nela."
        />
        <Kpi
          loading={loading}
          label="Caixa livre"
          value={formatCurrency(caixaLivre)}
          color={saldoColor(caixaLivre, token)}
          hint="Saldo total menos o que está comprometido com obra a executar. É o dinheiro que sobra de fato."
          emphasis
        />
        <Kpi
          loading={loading}
          label="Aporte total a fazer"
          value={formatCurrency(aporteTotalAFazer)}
          color={aporteTotalAFazer > 0 ? token.colorWarning : token.colorText}
          hint="Soma do que falta entrar em cada obra para cobrir o orçamento dela por inteiro."
        />
      </div>

      <Card style={{ marginTop: 16 }}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 1 }} title={false} />
        ) : coberturaCaixaPct === null ? (
          <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
            Nenhuma obra com orçamento a executar — sem cobertura a calcular.
          </div>
        ) : (
          <>
            <div
              style={{
                color: token.colorTextSecondary,
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              Cobertura de caixa
            </div>
            <Progress
              percent={Math.min(coberturaCaixaPct, 100)}
              strokeColor={coberturaColor(coberturaCaixaPct, token)}
              format={() => formatPercent(coberturaCaixaPct)}
            />
            <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
              {COBERTURA_HINT}
            </div>
          </>
        )}
      </Card>
    </SectionBlock>
  );
}
