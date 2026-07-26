import { Card, Progress, Skeleton, theme } from "antd";
import type { CSSProperties } from "react";
import { HintLabel } from "../../components/HintLabel";
import { SectionBlock } from "../../components/SectionBlock";
import type { DashboardSummaryResponse } from "../../api/modules/types";
import { usePrivacyFormat } from "../../privacyContext";
import { coberturaColor, saldoColor } from "../../utils/thresholds";

type ExecutiveSummaryProps = {
  summary: DashboardSummaryResponse | null;
  loading: boolean;
};

const SALDO_TOTAL_HINT =
  "Soma do saldo de caixa de todas as obras (entradas realizadas menos saídas realizadas), até hoje.";
const CAIXA_COMPROMETIDO_HINT =
  "Soma do custo que ainda falta para concluir as obras em andamento, com base no orçamento e no que já foi gasto.";
const CAIXA_LIVRE_HINT =
  "Saldo total menos o caixa comprometido com obra a executar — o que sobra livre de compromissos já assumidos.";
const APORTE_HINT =
  "Soma do aporte que os donos de obra própria ainda precisam colocar para cobrir o custo restante que o caixa da obra não cobre.";
const COBERTURA_HINT =
  "Cobertura de caixa = saldo total de todas as obras ÷ soma do orçamento que ainda resta a executar. Acima de 100% o caixa cobre tudo que falta; abaixo disso falta dinheiro para terminar.";

const columnStyle: CSSProperties = { flex: 1, minWidth: 150 };

const labelStyle: CSSProperties = {
  fontSize: 12,
  marginBottom: 6,
  display: "flex",
  alignItems: "center",
  gap: 4,
};

const valueStyle: CSSProperties = { fontSize: 24, fontWeight: 600 };

/**
 * Posição de caixa — snapshot, ignora o seletor de período do Consolidado
 * (um saldo acumulado até hoje não tem "versão de mês passado"). As 4
 * métricas dividem UM card por bordas verticais, com o bloco de cobertura de
 * caixa logo abaixo.
 */
export function ExecutiveSummary({ summary, loading }: ExecutiveSummaryProps) {
  const { token } = theme.useToken();
  const { formatCurrency, formatPercent } = usePrivacyFormat();

  const saldoTotal = summary?.saldoTotal ?? 0;
  const caixaComprometido = summary?.caixaComprometido ?? 0;
  const caixaLivre = summary?.caixaLivre ?? 0;
  const aporteTotalAFazer = summary?.aporteTotalAFazer ?? 0;
  const coberturaCaixaPct = summary?.coberturaCaixaPct ?? null;

  const dividerStyle: CSSProperties = {
    ...columnStyle,
    borderLeft: `1px solid ${token.colorBorderSecondary}`,
    paddingLeft: 20,
  };

  return (
    <SectionBlock
      title="Posição de caixa"
      scope="acumulado"
      footnote="Não filtrado pelo seletor de período — é a posição de hoje."
    >
      <Card>
        {loading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 20,
                marginBottom: 24,
              }}
            >
              <div style={columnStyle}>
                <div style={{ ...labelStyle, color: token.colorTextSecondary }}>
                  <HintLabel label="Saldo total" hint={SALDO_TOTAL_HINT} iconFontSize={11} />
                </div>
                <div style={{ ...valueStyle, color: saldoColor(saldoTotal, token) }}>
                  {formatCurrency(saldoTotal)}
                </div>
              </div>
              <div style={dividerStyle}>
                <div style={{ ...labelStyle, color: token.colorTextSecondary }}>
                  <HintLabel
                    label="Comprometido com obra a executar"
                    hint={CAIXA_COMPROMETIDO_HINT}
                    iconFontSize={11}
                  />
                </div>
                <div style={{ ...valueStyle, color: token.colorText }}>
                  {formatCurrency(caixaComprometido)}
                </div>
              </div>
              <div style={dividerStyle}>
                <div style={{ ...labelStyle, color: token.colorTextSecondary }}>
                  <HintLabel label="Caixa livre" hint={CAIXA_LIVRE_HINT} iconFontSize={11} />
                </div>
                <div style={{ ...valueStyle, color: saldoColor(caixaLivre, token) }}>
                  {formatCurrency(caixaLivre)}
                </div>
              </div>
              <div style={dividerStyle}>
                <div style={{ ...labelStyle, color: token.colorTextSecondary }}>
                  <HintLabel label="Aporte total a fazer" hint={APORTE_HINT} iconFontSize={11} />
                </div>
                <div
                  style={{
                    ...valueStyle,
                    color: aporteTotalAFazer > 0 ? token.colorWarning : token.colorText,
                  }}
                >
                  {formatCurrency(aporteTotalAFazer)}
                </div>
              </div>
            </div>

            {coberturaCaixaPct === null ? (
              <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
                Nenhuma obra com orçamento a executar — sem cobertura a calcular.
              </div>
            ) : (
              <div
                style={{
                  background: token.colorFillTertiary,
                  borderRadius: 12,
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <HintLabel label="Cobertura de caixa" hint={COBERTURA_HINT} iconFontSize={11} />
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: coberturaColor(coberturaCaixaPct, token),
                    }}
                  >
                    {formatPercent(coberturaCaixaPct)}
                  </span>
                </div>
                <Progress
                  percent={Math.min(coberturaCaixaPct, 100)}
                  strokeColor={coberturaColor(coberturaCaixaPct, token)}
                  showInfo={false}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </SectionBlock>
  );
}
