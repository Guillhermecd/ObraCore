export type ProfileImage = {
  bucket: string;
  key: string;
  contentType: string;
  originalFilename?: string;
  url?: string;
};

export type User = {
  id: string;
  email: string;
  emailValidated: boolean;
  name: string | null;
  profileImage: ProfileImage | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageResponse = {
  message: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  color: string | null;
  owner: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseSource = {
  id: string;
  name: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
};

export const PAYMENT_METHODS = [
  "Dinheiro",
  "PIX",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Boleto",
  "Transferência",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type Expense = {
  id: string;
  date: string;
  categoryId: string;
  sourceId: string;
  supplier: string | null;
  paymentMethod: PaymentMethod;
  amount: number;
  notes: string | null;
  owner: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseImportRow = {
  rowNumber: number;
  date: string | null;
  categoryName: string;
  categoryIsNew: boolean;
  sourceName: string;
  sourceIsNew: boolean;
  supplier: string | null;
  paymentMethod: string | null;
  amount: number | null;
  notes: string | null;
  valid: boolean;
  errors: string[];
};

export type ExpenseImportSummary = {
  total: number;
  valid: number;
  invalid: number;
};

export type ExpenseImportPreviewResponse = {
  rows: ExpenseImportRow[];
  summary: ExpenseImportSummary;
};

export type ExpenseImportFailure = {
  rowNumber: number;
  message: string;
};

export type ExpenseImportCommitResponse = {
  imported: number;
  failed: ExpenseImportFailure[];
};
