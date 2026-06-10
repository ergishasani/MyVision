create extension if not exists pgcrypto;

create type company_member_role as enum ('owner', 'admin', 'member', 'accountant');
create type user_status as enum ('active', 'invited', 'disabled');
create type client_type as enum ('business', 'individual');
create type project_status as enum ('draft', 'active', 'paused', 'completed', 'cancelled');
create type quote_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted');
create type invoice_status as enum ('draft', 'sent', 'unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled');
create type invoice_type as enum ('standard', 'deposit', 'progress', 'final', 'credit_note');
create type line_item_kind as enum ('labor', 'materials', 'equipment', 'transport', 'service', 'other');
create type payment_method as enum ('bank_transfer', 'cash', 'card', 'paypal', 'stripe', 'other');

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  phone text,
  status user_status not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  vat_number text,
  registration_number text,
  email text,
  phone text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country_code char(2) not null default 'DE',
  default_currency char(3) not null default 'EUR',
  default_language text not null default 'en',
  logo_url text,
  bank_name text,
  iban text,
  bic text,
  payment_terms_days integer not null default 14,
  invoice_prefix text not null default 'INV',
  next_invoice_number integer not null default 1,
  quote_prefix text not null default 'Q',
  next_quote_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role company_member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  type client_type not null default 'business',
  name text not null,
  contact_name text,
  email text,
  phone text,
  vat_number text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country_code char(2) not null default 'DE',
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  name text not null,
  code text,
  status project_status not null default 'draft',
  job_site_address_line1 text,
  job_site_address_line2 text,
  job_site_city text,
  job_site_region text,
  job_site_postal_code text,
  job_site_country_code char(2) not null default 'DE',
  start_date date,
  end_date date,
  budget_amount numeric(12, 2),
  currency char(3) not null default 'EUR',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,
  quote_number text not null,
  status quote_status not null default 'draft',
  issue_date date not null default current_date,
  valid_until date,
  currency char(3) not null default 'EUR',
  subtotal_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  notes text,
  terms text,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, quote_number)
);

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  position integer not null,
  kind line_item_kind not null default 'service',
  description text not null,
  quantity numeric(12, 3) not null default 1,
  unit text not null default 'pcs',
  unit_price numeric(12, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 19,
  discount_amount numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (quote_id, position)
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,
  source_quote_id uuid references quotes(id) on delete set null,
  invoice_number text not null,
  type invoice_type not null default 'standard',
  status invoice_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  currency char(3) not null default 'EUR',
  subtotal_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  amount_paid numeric(12, 2) not null default 0,
  balance_due numeric(12, 2) not null default 0,
  notes text,
  terms text,
  sent_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, invoice_number)
);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  position integer not null,
  kind line_item_kind not null default 'service',
  description text not null,
  quantity numeric(12, 3) not null default 1,
  unit text not null default 'pcs',
  unit_price numeric(12, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 19,
  discount_amount numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (invoice_id, position)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12, 2) not null,
  currency char(3) not null default 'EUR',
  method payment_method not null default 'bank_transfer',
  paid_at timestamptz not null default now(),
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

create table company_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  quote_footer text,
  invoice_footer text,
  default_vat_rate numeric(5, 2) not null default 19,
  dashboard_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  quote_id uuid references quotes(id) on delete cascade,
  invoice_id uuid references invoices(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  mime_type text not null default 'application/pdf',
  created_at timestamptz not null default now(),
  check (
    (quote_id is not null and invoice_id is null)
    or (quote_id is null and invoice_id is not null)
  )
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_set_updated_at before update on users
for each row execute function set_updated_at();

create trigger companies_set_updated_at before update on companies
for each row execute function set_updated_at();

create trigger clients_set_updated_at before update on clients
for each row execute function set_updated_at();

create trigger projects_set_updated_at before update on projects
for each row execute function set_updated_at();

create trigger quotes_set_updated_at before update on quotes
for each row execute function set_updated_at();

create trigger invoices_set_updated_at before update on invoices
for each row execute function set_updated_at();

create trigger company_settings_set_updated_at before update on company_settings
for each row execute function set_updated_at();

create index idx_company_members_user_id on company_members(user_id);
create index idx_clients_company_id on clients(company_id);
create index idx_projects_company_id on projects(company_id);
create index idx_projects_client_id on projects(client_id);
create index idx_quotes_company_id on quotes(company_id);
create index idx_quotes_client_id on quotes(client_id);
create index idx_quotes_project_id on quotes(project_id);
create index idx_invoices_company_id on invoices(company_id);
create index idx_invoices_client_id on invoices(client_id);
create index idx_invoices_project_id on invoices(project_id);
create index idx_invoices_status on invoices(status);
create index idx_payments_invoice_id on payments(invoice_id);
create index idx_documents_company_id on documents(company_id);

