import { Grid, Segmented, message, theme } from "antd";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardService } from "../../api/modules/DashboardService";
import type {
  DashboardAlert,
  CashflowForecastResponse,
  DashboardSummaryResponse,
  PeriodoConsolidado,
} from "../../api/modules/types";
import { useActiveGroup } from "../../layouts/groupContext";
import { usePrivateMobileHeader } from "../../layouts/privateMobileHeader";
import { getErrorMessage } from "../../utils/errors";
import { AlertsPanel } from "./AlertsPanel";
import { CashFlowForecast } from "./CashFlowForecast";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { ResultBlock } from "./ResultBlock";
import { ResultHeroCard } from "./ResultHeroCard";
import { ResultadoProjetadoBlock } from "./ResultadoProjetadoBlock";
import { ResultadoRealizadoBlock } from "./ResultadoRealizadoBlock";
import { TrendChart } from "./TrendChart";

const PERIODO_OPTIONS: { label: string; value: PeriodoConsolidado }[] = [
  { label: "Mês", value: "mes" },
  { label: "Trimestre", value: "tri" },
  { label: "Ano", value: "ano" },
  { label: "Tudo", value: "tudo" },
];

/**
 * Palavra usada na frase do cabeçalho ("O período X governa..."), separada
 * do rótulo do pill do Segmented: "Tudo" vira "todo o período" na frase, não
 * um `.toLowerCase()` direto do rótulo.
 */
const PERIODO_FRASE: Record<PeriodoConsolidado, string> = {
  mes: "mês",
  tri: "trimestre",
  ano: "ano",
  tudo: "todo o período",
};

const pageHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: 16,
  marginBottom: 24,
};

const heroGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.55fr 1fr",
  gap: 22,
  marginBottom: 24,
  alignItems: "stretch",
};

const heroGridMobileStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 22,
  marginBottom: 24,
};

const detalhamentoGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 22,
  marginBottom: 24,
};

export function VisaoGeralPage() {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.md);
  usePrivateMobileHeader("Dashboard");
  const navigate = useNavigate();
  const { setActiveGroupId } = useActiveGroup();
  const [messageApi, contextHolder] = message.useMessage();

  const [periodo, setPeriodo] = useState<PeriodoConsolidado>("tudo");

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  // Loading derivado do período já carregado — trocar de período já entra em
  // carregamento no mesmo render, sem um `setState` síncrono dentro do
  // efeito (mesmo padrão do `movLoading` da tela Status).
  const [loadedPeriodo, setLoadedPeriodo] = useState<PeriodoConsolidado | null>(null);
  const summaryLoading = loadedPeriodo !== periodo;

  const [forecast, setForecast] = useState<CashflowForecastResponse | null>(
    null,
  );
  const [forecastLoading, setForecastLoading] = useState(true);

  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    DashboardService.summary(periodo)
      .then((response) => setSummary(response))
      .catch((error: unknown) => {
        messageApi.error(getErrorMessage(error, "Erro ao carregar o consolidado de caixa."));
      })
      .finally(() => setLoadedPeriodo(periodo));
  }, [messageApi, periodo]);

  useEffect(() => {
    DashboardService.cashflowForecast()
      .then((response) => setForecast(response))
      .catch((error: unknown) => {
        messageApi.error(getErrorMessage(error, "Erro ao carregar fluxo de caixa previsto."));
      })
      .finally(() => setForecastLoading(false));
  }, [messageApi]);

  useEffect(() => {
    DashboardService.alerts()
      .then((response) => setAlerts(response))
      .catch((error: unknown) => {
        messageApi.error(getErrorMessage(error, "Erro ao carregar alertas."));
      })
      .finally(() => setAlertsLoading(false));
  }, [messageApi]);

  function openProjectDashboard(groupId: string) {
    setActiveGroupId(groupId);
    navigate("/obra");
  }

  return (
    <section>
      {contextHolder}
      <div style={pageHeaderRowStyle}>
        <div>
          <h1
            style={{ margin: 0, color: token.colorTextHeading, fontSize: 26 }}
          >
            Dashboard — Financeiro
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              color: token.colorTextSecondary,
              fontSize: 13,
              maxWidth: 560,
            }}
          >
            Caixa e resultado de todas as obras. O período{" "}
            <strong style={{ color: token.colorText }}>{PERIODO_FRASE[periodo]}</strong>{" "}
            governa o Resultado e a tendência.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <Segmented
            value={periodo}
            onChange={(value) => setPeriodo(value as PeriodoConsolidado)}
            options={PERIODO_OPTIONS}
          />
          {summary && (
            <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
              {summary.periodoRange.label}
            </span>
          )}
        </div>
      </div>

      <div style={isDesktop ? heroGridStyle : heroGridMobileStyle}>
        <ResultHeroCard
          resultado={summary?.resultado ?? null}
          resultadoProjetado={summary?.resultadoProjetado ?? null}
          resultadoRealizado={summary?.resultadoRealizado ?? null}
          periodo={periodo}
          resultadoDeltaPct={summary?.resultadoDeltaPct ?? null}
          loading={summaryLoading}
        />
        <AlertsPanel
          alerts={alerts}
          loading={alertsLoading}
          onViewDetails={openProjectDashboard}
        />
      </div>

      <TrendChart trend={summary?.trend ?? []} loading={summaryLoading} />

      <ExecutiveSummary summary={summary} loading={summaryLoading} />

      <div style={detalhamentoGridStyle}>
        <ResultadoProjetadoBlock
          resultadoProjetado={summary?.resultadoProjetado ?? null}
          loading={summaryLoading}
        />
        <ResultBlock
          resultado={summary?.resultado ?? null}
          periodo={periodo}
          loading={summaryLoading}
        />
        <ResultadoRealizadoBlock
          resultadoRealizado={summary?.resultadoRealizado ?? null}
          loading={summaryLoading}
        />
      </div>

      <CashFlowForecast
        forecast={forecast}
        loading={forecastLoading}
        saldoAtual={summary?.saldoTotal ?? 0}
      />
    </section>
  );
}
