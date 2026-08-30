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

/** One month of the overview chart. `month` is ISO ("2026-08"); `label` is what the axis prints. */
export type DashboardRevenuePoint = {
  month: string;
  label: string;
  invoiced: number;
  collected: number;
};

/** An amount and how many invoices make it up. */
export type ReceivablesBucket = {
  amount: number;
  count: number;
};

/** The three buckets are mutually exclusive and sum to `total`. */
export type DashboardReceivables = {
  total: number;
  overdue: ReceivablesBucket;
  open: ReceivablesBucket;
  partiallyPaid: ReceivablesBucket;
};

/**
 * The VAT quarter in progress.
 *
 * `inputVatAvailable` is false because purchases are not modelled, so `payable` is only the
 * output-tax side of the return. The screen says so rather than presenting it as a filing figure.
 */
export type DashboardVat = {
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  outputVat: number;
  netRevenue: number;
  payable: number;
  inputVatAvailable: boolean;
};

export type DashboardTopClient = {
  clientId: string;
  name: string;
  amount: number;
  invoiceCount: number;
};

/** Revenue grouped by invoice line text — lines carry no link to the product catalogue. */
export type DashboardTopProduct = {
  description: string;
  amount: number;
  quantity: number;
};

export type DashboardOverview = {
  currency: string;
  greetingName: string | null;
  companyName: string | null;
  revenue: DashboardRevenuePoint[];
  revenueInvoicedTotal: number;
  revenueCollectedTotal: number;
  receivables: DashboardReceivables;
  vat: DashboardVat;
  topClients: DashboardTopClient[];
  topProducts: DashboardTopProduct[];
  draftInvoiceCount: number;
  openQuoteCount: number;
  activeProjectCount: number;
  clientCount: number;
  /** Both false: purchases, bank feeds and receipt matching are not part of this system. */
  expensesAvailable: boolean;
  bankAvailable: boolean;
};

/** One recorded action. `documentLabel`/`clientName` are null once the record is gone. */
export type ActivityEntry = {
  id: string;
  createdAt: string;
  actorName: string | null;
  entityType: string;
  entityId: string;
  action: string;
  documentLabel: string | null;
  clientName: string | null;
};

export type DashboardActivity = {
  entries: ActivityEntry[];
  page: number;
  size: number;
  total: number;
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
  type: "business" | "individual";
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
  region: string | null;
  postalCode: string | null;
  countryCode: string | null;
  notes: string | null;
  /** Set once the contact is hidden from the list. They stay fetchable by id. */
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** One invoice as it appears in a contact's billing history. No line items — see `Invoice`. */
export type ClientInvoiceSummary = {
  id: string;
  projectId: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  sentAt: string | null;
  paidAt: string | null;
};

export type ClientQuoteSummary = {
  id: string;
  projectId: string | null;
  quoteNumber: string;
  status: QuoteStatus;
  issueDate: string;
  validUntil: string | null;
  currency: string;
  totalAmount: number;
  sentAt: string | null;
  acceptedAt: string | null;
};

/**
 * A contact's headline billing figures.
 *
 * Counts cover every document. The money figures are all in `currency` and cover only the
 * documents issued in it; `excludedCurrencies` names anything left out, so the screen can say
 * a total is partial instead of quietly under-reporting.
 */
export type ClientStats = {
  currency: string;
  excludedCurrencies: string[];
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  invoiceCount: number;
  draftInvoiceCount: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  quoteCount: number;
  openQuoteCount: number;
  openQuoteValue: number;
  projectCount: number;
  activeProjectCount: number;
  firstInvoiceDate: string | null;
  lastInvoiceDate: string | null;
  /** Mean days from issue to settlement. Null until they have paid something. */
  averageDaysToPay: number | null;
};

export type ClientOverview = {
  client: Client;
  stats: ClientStats;
  invoices: ClientInvoiceSummary[];
  quotes: ClientQuoteSummary[];
  projects: Project[];
};

export type NumberRangeType =
  | "invoice"
  | "quote"
  | "credit_note"
  | "order_confirmation"
  | "delivery_note"
  | "contact"
  | "product"
  | "debtor"
  | "creditor";

/**
 * One numbering counter.
 *
 * `format` holds the literal `%NUMBER`; `preview` is what the next document would actually be
 * called, computed by the API so the screen never has to reimplement the rendering.
 */
export type NumberRange = {
  id: string | null;
  type: NumberRangeType;
  format: string;
  padding: number;
  nextNumber: number;
  preview: string;
};

export type BookingAccount = {
  id: string;
  displayName: string;
  name: string | null;
  skrAccount: string | null;
};

export type CostCenter = {
  id: string;
  name: string;
  number: string | null;
};

export type CompanyMemberRole = "owner" | "admin" | "member" | "accountant";

export type TeamMember = {
  /** The membership id, not the user id: a role belongs to the membership. */
  id: string;
  userId: string;
  fullName: string | null;
  email: string;
  role: CompanyMemberRole;
  status: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  joinedAt: string;
};

export type ProductCategory = "article" | "service";

/** The units a product can be sold in. Mirrors the `product_unit` enum in the database. */
export type ProductUnitCode =
  | "pcs"
  | "lump_sum"
  | "hour"
  | "percent"
  | "day"
  | "sqm"
  | "meter"
  | "kg"
  | "tonne"
  | "linear_meter"
  | "cbm"
  | "km"
  | "litre";

/** An alternative unit. `priceNet` is derived by the API, never stored. */
export type ProductUnit = {
  id: string;
  unit: ProductUnitCode;
  factor: number;
  priceNet: number;
};

export type Product = {
  id: string;
  articleNumber: number | null;
  name: string;
  category: ProductCategory;
  unit: ProductUnitCode;
  taxRate: number;
  /** Net is the stored price; the gross figures are computed by the API on every read. */
  sellingPriceNet: number;
  sellingPriceGross: number;
  purchasePriceNet: number | null;
  purchasePriceGross: number | null;
  description: string | null;
  internalNote: string | null;
  inventoryEnabled: boolean;
  units: ProductUnit[];
  archivedAt: string | null;
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

/** Which VAT treatment an invoice falls under. Each obliges a different note on the document. */
export type InvoiceTaxScheme =
  | "domestic_taxable"
  | "domestic_exempt"
  | "reverse_charge_13b"
  | "eu_b2b"
  | "export_non_eu";

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
  /** Date of supply. Sec. 14 UStG requires this or a service period. */
  deliveryDate: string | null;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
  subject: string | null;
  reference: string | null;
  taxScheme: InvoiceTaxScheme;
  paymentMethod: string;
  language: string;
  costCenterId: string | null;
  contactPersonUserId: string | null;
  skontoDays: number | null;
  skontoPercent: number | null;
  eInvoice: boolean;
  /** False issues the document under the owner's own name instead of the company's. */
  showCompanyName: boolean;
  recipientEmail: string | null;
  /** The recipient as printed — a snapshot, so it does not follow the contact if they move. */
  recipientName: string | null;
  recipientAddressLine1: string | null;
  recipientAddressLine2: string | null;
  recipientPostalCode: string | null;
  recipientCity: string | null;
  recipientCountryCode: string | null;
  /** The operator's filing labels. Editable after issue, unlike the document itself. */
  tags: string[];
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

export type DeliveryNoteStatus = "draft" | "sent" | "delivered" | "cancelled";

export type DeliveryNoteItem = {
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

/**
 * A delivery note: what was handed over, and when.
 *
 * Not a tax document — nothing is owed because one exists and it never becomes an invoice. The
 * amounts restate the sale for the customer's benefit.
 */
export type DeliveryNote = {
  id: string;
  clientId: string;
  projectId: string | null;
  /** Set when the note was raised off an existing document. */
  invoiceId: string | null;
  quoteId: string | null;
  deliveryNoteNumber: string;
  status: DeliveryNoteStatus;
  subject: string | null;
  deliveryDate: string;
  reference: string | null;
  /** Held apart from the contact's own address: goods go to a site, not to billing. */
  deliveryAddressLine1: string | null;
  deliveryAddressLine2: string | null;
  deliveryPostalCode: string | null;
  deliveryCity: string | null;
  deliveryRegion: string | null;
  deliveryCountryCode: string | null;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  headerText: string | null;
  footerText: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: DeliveryNoteItem[];
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

export type PaymentMethod =
  | "bank_transfer"
  | "cash"
  | "card"
  | "paypal"
  | "stripe"
  | "other";

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
  // Numbering deliberately absent: prefixes and counters moved to number_ranges and are edited
  // through the accounting settings endpoint, which refuses to rewind a counter.
  defaultPaymentMethod: PaymentMethod;
  defaultVatRate: number | null;
  quoteFooter: string | null;
  invoiceFooter: string | null;
};

/**
 * One numbered line of the advance-return form.
 *
 * The form has two Kennziffer columns — one for the basis of assessment, one for the tax. Most
 * lines use only one: Kz 81 has a basis box but no tax box, input-tax lines are the reverse. A
 * null code means the form has no box there; a null amount means MyVision has nothing to put in
 * it, which is not the same as nil.
 */
export type VatReturnLine = {
  basisCode: string | null;
  taxCode: string | null;
  label: string;
  basis: number | null;
  tax: number | null;
  available: boolean;
};

/** One collapsible block of the form. `derived: false` means MyVision cannot source it at all. */
export type VatReturnGroup = {
  label: string;
  derived: boolean;
  basis: number | null;
  tax: number | null;
  lines: VatReturnLine[];
};

/**
 * A German VAT advance return (UStVA) for a period.
 *
 * `payable` is null whenever input tax is unavailable: the Zahllast is output tax minus input
 * tax, and this system holds sales but not purchases, so the subtraction cannot be done.
 */
export type VatReturn = {
  from: string;
  to: string;
  currency: string;
  groups: VatReturnGroup[];
  outputTaxTotal: number;
  inputTaxAvailable: boolean;
  payable: number | null;
  invoiceCount: number;
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
