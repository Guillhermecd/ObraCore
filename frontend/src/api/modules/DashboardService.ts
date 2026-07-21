import { api } from "./api";
import type { DashboardOverviewResponse, MovimentacoesResponse } from "./types";

export const DashboardService = {
  overview() {
    return api<DashboardOverviewResponse>("/dashboard/overview");
  },
  movimentacoes(page: number, limit: number) {
    return api<MovimentacoesResponse>(
      `/dashboard/movimentacoes?page=${page}&limit=${limit}`,
    );
  },
};
