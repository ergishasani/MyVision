-- Delivery notes (Lieferscheine).
--
-- A delivery note says what was handed over and when. It is not a tax document: it never becomes
-- an invoice and nothing is owed because one exists. It is kept alongside the invoice as evidence
-- of what was actually delivered, which is what a customer disputes months later.
--
-- Numbering already existed for this type (LI-%NUMBER in V12), so nothing is added here for it.

create type delivery_note_status as enum ('draft', 'sent', 'delivered', 'cancelled');

create table delivery_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,

  -- Where this note came from, when it was raised off an existing document. Both are optional:
  -- a delivery note can stand on its own. `set null` so deleting the source never deletes the
  -- record of what was delivered.
  invoice_id uuid references invoices(id) on delete set null,
  quote_id uuid references quotes(id) on delete set null,

  delivery_note_number text not null,
  status delivery_note_status not null default 'draft',
  subject text,
  delivery_date date not null default current_date,
  reference text,

  -- The delivery address, held separately from the contact's own. Goods go to a building site,
  -- not to the customer's billing address, and the two are routinely different in construction.
  delivery_address_line1 text,
  delivery_address_line2 text,
  delivery_postal_code text,
  delivery_city text,
  delivery_region text,
  delivery_country_code char(2),

  currency char(3) not null default 'EUR',
  subtotal_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,

  header_text text,
  footer_text text,

  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, delivery_note_number)
);

create table delivery_note_items (
  id uuid primary key default gen_random_uuid(),
  delivery_note_id uuid not null references delivery_notes(id) on delete cascade,
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
  unique (delivery_note_id, position)
);

create index idx_delivery_notes_company_date
  on delivery_notes (company_id, delivery_date desc);

create index idx_delivery_notes_client on delivery_notes (client_id);

create index idx_delivery_note_items_note on delivery_note_items (delivery_note_id);
