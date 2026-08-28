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

export type ContactDetail = {
  id: string;
  kind: "phone" | "email" | "website";
  label: string;
  value: string;
  position: number;
};

/** Whether a customer discount is a share of the total or a fixed sum off it. */
export type DiscountUnit = "percent" | "absolute";

export type Client = {
  id: string;
  type: string;
  name: string;
  contactName: string | null;
  salutation: string | null;
  academicTitle: string | null;
  firstName: string | null;
  lastName: string | null;
  nameSuffix: string | null;
  position: string | null;
  contactRole: string;
  customerNumber: number | null;
  debtorNumber: string | null;
  creditorNumber: string | null;
  contactDetails: ContactDetail[];
  iban: string | null;
  bic: string | null;
  taxNumber: string | null;
  showVatId: boolean;
  einvoiceStandard: boolean;
  paymentTermsDays: number | null;
  /** Skonto: the early-payment window, and the rate that applies inside it. */
  discountDays: number | null;
  discountPercent: number | null;
  /** A standing discount. Meaningless without its unit — 10 and 10% differ. */
  customerDiscount: number | null;
  customerDiscountUnit: DiscountUnit;
  terms: string | null;
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

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "unpaid"
  | "partially_paid"
  | "overdue"
  | "paid"
  | "cancelled";

export type InvoiceItem = {
  id: string;
  kind: string;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  taxRate: number;
  discountAmount: number;
  lineTotal: number;
  position: number;
};

export type Invoice = {
  id: string;
  clientId: string;
  projectId: string | null;
  sourceQuoteId: string | null;
  invoiceNumber: string;
  type: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  notes: string | null;
  terms: string | null;
  sentAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  lastPaymentError: string | null;
  lastPaymentErrorAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: InvoiceItem[];
};

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "converted" | "expired";

export type Quote = {
  id: string;
  clientId: string;
  projectId: string | null;
  quoteNumber: string;
  status: QuoteStatus;
  issueDate: string;
  validUntil: string | null;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  terms: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: InvoiceItem[];
};

export type Project = {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  status: string;
  jobSiteCity: string | null;
  startDate: string | null;
  endDate: string | null;
  budgetAmount: number | null;
  currency: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentListItem = {
  id: string;
  invoiceId: string;
  invoiceNumber: string | null;
  clientId: string | null;
  clientName: string | null;
  amount: number;
  currency: string;
  method: string;
  paidAt: string;
  reference: string | null;
  stripeFeeAmount: number | null;
  netAmount: number | null;
};

export type StoredDocument = {
  id: string;
  invoiceId: string | null;
  quoteId: string | null;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  createdAt: string;
};

export type CompanyProfile = {
  id: string;
  name: string;
  legalName: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  defaultCurrency: string;
  defaultLanguage: string;
  logoUrl: string | null;
  bankName: string | null;
  iban: string | null;
  bic: string | null;
  paymentTermsDays: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  quotePrefix: string;
  nextQuoteNumber: number;
  defaultVatRate: number | null;
  quoteFooter: string | null;
  invoiceFooter: string | null;
};

export type VatRateLine = {
  rate: number;
  netAmount: number;
  vatAmount: number;
};

export type VatReport = {
  from: string;
  to: string;
  currency: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  invoiceCount: number;
  byRate: VatRateLine[];
};
