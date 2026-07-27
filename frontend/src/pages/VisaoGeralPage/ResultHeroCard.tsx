import { QuestionCircleOutlined } from "@ant-design/icons";
import { Card, Skeleton, Tooltip, theme } from "antd";
import type { CSSProperties } from "react";
import type {
  DashboardResultado,
  DashboardResultadoProjetado,
  DashboardResultadoRealizado,
  PeriodoConsolidado,
} from "../../api/modules/types";
import { plural } from "../../utils/format";
import { usePrivacyFormat } from "../../privacyContext";
import { saldoColor } from "../../utils/thresholds";

const LUCRO_RECONHECIDO_HINT =
  "Receita reconhecida menos custo realizado das obras de cliente no período selecionado, pelo percentual de avanço (custo realizado ÷ orçamento) aplicado ao contrato. Obra própria não entra — não gera receita.";
const MARGEM_HINT = "Lucro reconhecido dividido pela receita reconhecida do período.";
const PROJETADO_HINT =
  "Lucro esperado das obras em andamento (clientes e próprias), somando o custo já realizado ao que ainda falta para concluir, contra o contrato ou a venda esperada.";
const REALIZADO_HINT =
  "Lucro definitivo das obras concluídas (clientes e próprias): valor de fechamento menos custo total gasto.";

const PERIODO_WORD: Record<PeriodoConsolidado, string> = {
  mes: "no mês",
  tri: "no trimestre",
  ano: "no ano",
  tudo: "no total",
};

/**
 * "tudo" nunca aparece de fato: sem janela anterior pra comparar,
 * `resultadoDeltaPct` sempre vem `null` nesse período e a linha de delta
 * não é renderizada (ver `resultadoDeltaPct !== null` abaixo). A chave
 * existe só para satisfazer o `Record<PeriodoConsolidado, string>`.
 */
const PERIODO_ANTERIOR_WORD: Record<PeriodoConsolidado, string> = {
  mes: "mês anterior",
  tri: "trimestre anterior",
  ano: "ano anterior",
  tudo: "período anterior",
};

type ResultHeroCardProps = {
  resultado: DashboardResultado | null;
  resultadoProjetado: DashboardResultadoProjetado | null;
  resultadoRealizado: DashboardResultadoRealizado | null;
  periodo: PeriodoConsolidado;
  resultadoDeltaPct: number | null;
  loading: boolean;
};

const footerColStyle: CSSProperties = { flex: 1, minWidth: 0 };

/**
 * Metade esquerda do herói do Consolidado — responde "estou lucrando?
 * quanto?" com um número grande (lucro reconhecido do período selecionado) e
 * dois números de apoio (projetado/realizado, sempre acumulados).
 */
export function ResultHeroCard({
  resultado,
  resultadoProjetado,
  resultadoRealizado,
  periodo,
  resultadoDeltaPct,
  loading,
}: ResultHeroCardProps) {
  const { token } = theme.useToken();
  const { formatCurrency, formatPercent } = usePrivacyFormat();

  const lucroReconhecido = resultado?.lucroReconhecido ?? 0;
  const receitaReconhecida = resultado?.receitaReconhecida ?? 0;
  const margemPct = resultado?.margemPct ?? null;

  const lucroProjetado = resultadoProjetado?.lucroProjetadoTotal ?? 0;
  const obrasProjetado = resultadoProjetado?.obrasEmAndamento ?? 0;
  const margemProjetado = resultadoProjetado?.margemPct ?? null;

  const lucroRealizado = resultadoRealizado?.lucroRealizadoTotal ?? 0;
  const obrasRealizado = resultadoRealizado?.obrasConcluidas ?? 0;
  const margemRealizado = resultadoRealizado?.margemPct ?? null;

  if (loading) {
    return (
      <Card style={{ height: "100%" }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  return (
    <Card style={{ height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            color: token.colorTextSecondary,
            fontSize: 13,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Lucro reconhecido {PERIODO_WORD[periodo]}
          <Tooltip title={LUCRO_RECONHECIDO_HINT}>
            <QuestionCircleOutlined style={{ cursor: "help", fontSize: 12 }} />
          </Tooltip>
        </span>
        {margemPct !== null && (
          <Tooltip title={MARGEM_HINT}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: token.colorSuccess,
                background: token.colorSuccessBg,
                padding: "4px 10px",
                borderRadius: 20,
                cursor: "help",
              }}
            >
              Margem {formatPercent(margemPct)}
            </span>
          </Tooltip>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          marginTop: 14,
        }}
      >
        <span
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: saldoColor(lucroReconhecido, token),
            letterSpacing: "-.02em",
          }}
        >
          {formatCurrency(lucroReconhecido)}
        </span>
        {resultadoDeltaPct !== null && (
          <span style={{ color: token.colorTextSecondary, fontSize: 13 }}>
            {resultadoDeltaPct > 0 ? "+" : ""}
            {formatPercent(resultadoDeltaPct)} vs. {PERIODO_ANTERIOR_WORD[periodo]}
          </span>
        )}
      </div>
      <div style={{ color: token.colorTextSecondary, fontSize: 13, marginTop: 4 }}>
        sobre{" "}
        <span style={{ color: token.colorText, fontWeight: 500 }}>
          {formatCurrency(receitaReconhecida)}
        </span>{" "}
        de receita reconhecida
      </div>

      <div
        style={{
          display: "flex",
          gap: 14,
          marginTop: 24,
          paddingTop: 20,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div style={footerColStyle}>
          <div
            style={{
              color: token.colorTextSecondary,
              fontSize: 12,
              marginBottom: 5,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Projetado · em andamento
            <Tooltip title={PROJETADO_HINT}>
              <QuestionCircleOutlined style={{ cursor: "help", fontSize: 11 }} />
            </Tooltip>
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: saldoColor(lucroProjetado, token),
            }}
          >
            {formatCurrency(lucroProjetado)}
          </div>
          <div style={{ color: token.colorTextTertiary, fontSize: 11, marginTop: 2 }}>
            {plural(obrasProjetado, "obra", "obras")}
            {margemProjetado !== null && ` · margem ${formatPercent(margemProjetado)}`}
          </div>
        </div>
        <div style={{ width: 1, background: token.colorBorderSecondary }} />
        <div style={footerColStyle}>
          <div
            style={{
              color: token.colorTextSecondary,
              fontSize: 12,
              marginBottom: 5,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Realizado · concluídas
            <Tooltip title={REALIZADO_HINT}>
              <QuestionCircleOutlined style={{ cursor: "help", fontSize: 11 }} />
            </Tooltip>
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: saldoColor(lucroRealizado, token),
            }}
          >
            {formatCurrency(lucroRealizado)}
          </div>
          <div style={{ color: token.colorTextTertiary, fontSize: 11, marginTop: 2 }}>
            {plural(obrasRealizado, "obra", "obras")}
            {margemRealizado !== null && ` · margem ${formatPercent(margemRealizado)}`}
          </div>
        </div>
      </div>
    </Card>
  );
}
