import { api, apiDownload } from "./api";
import type {
  Expense,
  ExpenseImportCommitResponse,
  ExpenseImportPreviewResponse,
  ExpenseTipo,
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
  tipo?: ExpenseTipo;
  dataPrevista?: string | null;
  dataRealizada?: string | null;
};

type UpdateExpensePayload = Partial<CreateExpensePayload>;

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
  exportXlsx() {
    return apiDownload("/expenses/export", "lancamentos.xlsx");
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
  uploadComprovante(id: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return api<ExpenseResponse>(`/expenses/${id}/comprovante`, {
      method: "POST",
      body: formData,
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
