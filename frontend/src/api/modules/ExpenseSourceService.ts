import { api } from "./api";
import type { ExpenseSource } from "./types";

export type CreateExpenseSourcePayload = {
  name: string;
};

type ExpenseSourceListResponse = {
  sources: ExpenseSource[];
};

type ExpenseSourceResponse = {
  source: ExpenseSource;
};

export const ExpenseSourceService = {
  list() {
    return api<ExpenseSourceListResponse>("/expense-sources");
  },
  create(payload: CreateExpenseSourcePayload) {
    return api<ExpenseSourceResponse>("/expense-sources", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
