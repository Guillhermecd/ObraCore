import { api } from "./api";
import type { ExpenseCategory, MessageResponse } from "./types";

export type CreateExpenseCategoryPayload = {
  name: string;
  color?: string;
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
  remove(id: string) {
    return api<MessageResponse>(`/expense-categories/${id}`, {
      method: "DELETE",
    });
  },
};
