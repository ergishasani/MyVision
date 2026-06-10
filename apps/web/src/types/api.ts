export type ApiErrorBody = {
  message: string;
  code: string;
  timestamp?: string;
  fields?: Record<string, string>;
};

export type User = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
  emailVerified: boolean;
};

export type Company = {
  id: string;
  name: string;
  legalName: string | null;
  vatNumber: string | null;
  countryCode: string;
  defaultCurrency: string;
  defaultLanguage: string;
};

export type AuthResponse = {
  token: string;
  refreshToken: string;
  expiresInMs: number;
  user: User;
  company: Company;
};

export type DashboardSummary = {
  totalInvoicedThisMonth: number;
  paidAmountThisMonth: number;
  unpaidAmount: number;
  overdueAmount: number;
  overdueInvoiceCount: number;
  activeProjectCount: number;
  pendingQuoteCount: number;
  recentInvoices: unknown[];
  recentClients: unknown[];
};

export type Client = {
  id: string;
  type: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
