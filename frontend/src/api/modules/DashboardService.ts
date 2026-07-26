import { api } from "./api";
import type {
  CashflowForecastResponse,
  DashboardAlert,
  DashboardObraResponse,
  DashboardSummaryResponse,
  MovimentacoesResponse,
  PeriodoConsolidado,
  ProjectPerformance,
} from "./types";

function periodParams(params: URLSearchParams, from?: string, to?: string) {
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return params;
}

export const DashboardService = {
  movimentacoes(page: number, limit: number, from?: string, to?: string) {
    const params = periodParams(
      new URLSearchParams({ page: String(page), limit: String(limit) }),
      from,
      to,
    );
    return api<MovimentacoesResponse>(
      `/dashboard/movimentacoes?${params.toString()}`,
    );
  },
  summary(period?: PeriodoConsolidado) {
    const query = period ? `?period=${period}` : "";
    return api<DashboardSummaryResponse>(`/dashboard/summary${query}`);
  },
  cashflowForecast() {
    return api<CashflowForecastResponse>("/dashboard/cashflow-forecast");
  },
  alerts() {
    return api<DashboardAlert[]>("/dashboard/alerts");
  },
  projectsPerformance() {
    return api<ProjectPerformance[]>("/dashboard/projects-performance");
  },
  obra(groupId: string, from?: string, to?: string) {
    const params = periodParams(new URLSearchParams({ groupId }), from, to);
    return api<DashboardObraResponse>(`/dashboard/obra?${params.toString()}`);
  },
};
