import { api } from "./api";
import type { ExpenseCategory, ExpenseCategoryTipo } from "./types";

type CreateExpenseCategoryPayload = {
  name: string;
  color?: string;
  tipo?: ExpenseCategoryTipo;
};

type ExpenseCategoryListResponse = {
  categories: ExpenseCategory[];
};

type ExpenseCategoryResponse = {
  category: ExpenseCategory;
};

export const ExpenseCategoryService = {
  list() {
    return api<ExpenseCategoryListResponse>("/expense-categories");
  },
  create(payload: CreateExpenseCategoryPayload) {
    return api<ExpenseCategoryResponse>("/expense-categories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
