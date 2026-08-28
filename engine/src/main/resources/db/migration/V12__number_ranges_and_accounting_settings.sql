-- Accounting settings: number ranges, booking accounts, cost centres.

-- ---------------------------------------------------------------------------
-- Number ranges
--
-- Until now each counter lived in its own pair of columns on companies
-- (invoice_prefix/next_invoice_number, quote_prefix/next_quote_number, and the two counters added
-- for contacts and products). That does not extend to credit notes, order confirmations or
-- delivery notes without another pair of columns each time, and it gives the settings screen
-- nothing uniform to render. One row per counter replaces all of it.
--
-- §14 UStG requires invoice numbers to be unique and issued in a continuous sequence, so the
-- counter is only ever allowed to move forward. The service enforces that, and
-- unique (company_id, invoice_number) on invoices is the backstop if it ever fails to.
-- ---------------------------------------------------------------------------

create type number_range_type as enum (
  'invoice',
  'quote',
  'credit_note',
  'order_confirmation',
  'delivery_note',
  'contact',
  'product',
  'debtor',
  'creditor'
);

create table number_ranges (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  type number_range_type not null,

  -- A template containing the literal %NUMBER, e.g. 'RE-%NUMBER' or 'RE-2026-%NUMBER'.
  format text not null default '%NUMBER',

  -- Digits to zero-pad the number to. 4 renders 7 as 0007; 0 leaves it as 7.
  padding integer not null default 0,

  next_number integer not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, type),

  -- Without the placeholder every document would be handed the same string.
  constraint number_ranges_format_has_placeholder check (strpos(format, '%NUMBER') > 0),
  constraint number_ranges_next_number_positive check (next_number >= 1),
  constraint number_ranges_padding_range check (padding >= 0 and padding <= 12)
);

create index idx_number_ranges_company_id on number_ranges(company_id);

-- Carry the existing counters across. Invoices and quotes were rendered as "%s-%04d", so the
-- format and padding here reproduce exactly what those companies have already issued — a
-- migration must not change the shape of the next number a business puts on a document.
insert into number_ranges (company_id, type, format, padding, next_number)
select id, 'invoice'::number_range_type, invoice_prefix || '-%NUMBER', 4, next_invoice_number from companies
union all
select id, 'quote'::number_range_type, quote_prefix || '-%NUMBER', 4, next_quote_number from companies
union all
select id, 'contact'::number_range_type, '%NUMBER', 0, next_customer_number from companies
union all
select id, 'product'::number_range_type, '%NUMBER', 0, next_article_number from companies
union all
-- New counters, with the German document abbreviations these default to in practice:
-- GU Gutschrift, AB Auftragsbestätigung, LI Lieferschein.
select id, 'credit_note'::number_range_type, 'GU-%NUMBER', 4, 1 from companies
union all
select id, 'order_confirmation'::number_range_type, 'AB-%NUMBER', 4, 1 from companies
union all
select id, 'delivery_note'::number_range_type, 'LI-%NUMBER', 4, 1 from companies
union all
-- Ledger account numbers. The SKR conventions put customers at 10000 and suppliers at 70000.
select id, 'debtor'::number_range_type, '%NUMBER', 0, 10000 from companies
union all
select id, 'creditor'::number_range_type, '%NUMBER', 0, 70000 from companies;

-- The old columns are gone rather than left in place. Two copies of a counter is exactly the
-- drift that produces a duplicate invoice number.
alter table companies
  drop column invoice_prefix,
  drop column next_invoice_number,
  drop column quote_prefix,
  drop column next_quote_number,
  drop column next_customer_number,
  drop column next_article_number;

-- ---------------------------------------------------------------------------
-- Booking accounts (Buchungskonten)
-- ---------------------------------------------------------------------------

create table booking_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,

  -- What the operator calls it, versus the formal name on the chart of accounts.
  display_name text not null,
  name text,

  -- The SKR account, e.g. 8400 for revenue at 19% under SKR03. Text, not a number: some charts
  -- use leading zeros, and it is an identifier rather than a quantity.
  skr_account text,

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_booking_accounts_company_id on booking_accounts(company_id);

-- ---------------------------------------------------------------------------
-- Cost centres (Kostenstellen)
-- ---------------------------------------------------------------------------

create table cost_centers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  number text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Two cost centres sharing a number would make the reporting split meaningless.
  unique (company_id, number)
);

create index idx_cost_centers_company_id on cost_centers(company_id);

-- ---------------------------------------------------------------------------
-- The payment method offered by default on a new invoice.
-- ---------------------------------------------------------------------------

alter table companies
  add column default_payment_method payment_method not null default 'bank_transfer';
