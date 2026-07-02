import { api } from "./api";
import type {
  Expense,
  ExpenseImportCommitResponse,
  ExpenseImportPreviewResponse,
  MessageResponse,
  PaymentMethod,
} from "./types";

export type CreateExpensePayload = {
  date: string;
  categoryId: string;
  sourceId: string;
  supplier?: string;
  paymentMethod: PaymentMethod;
  amount: number;
  notes?: string;
};

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

type ExpenseListResponse = {
  expenses: Expense[];
};

type ExpenseResponse = {
  expense: Expense;
};

export const ExpenseService = {
  list() {
    return api<ExpenseListResponse>("/expenses");
  },
  create(payload: CreateExpensePayload) {
    return api<ExpenseResponse>("/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: UpdateExpensePayload) {
    return api<ExpenseResponse>(`/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  remove(id: string) {
    return api<MessageResponse>(`/expenses/${id}`, {
      method: "DELETE",
    });
  },
  importPreview(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return api<ExpenseImportPreviewResponse>("/expenses/import/preview", {
      method: "POST",
      body: formData,
    });
  },
  importCommit(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return api<ExpenseImportCommitResponse>("/expenses/import/commit", {
      method: "POST",
      body: formData,
    });
  },
};
