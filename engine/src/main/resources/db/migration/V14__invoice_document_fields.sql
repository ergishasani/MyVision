-- Fields a German invoice actually has to carry, plus the ones the editor collects.
--
-- The important one is delivery_date. docs/invoice-compliance-checklist.md lists "delivery or
-- service date/period" among the required fields and the table had nowhere to put it, so every
-- invoice this system has issued is missing a mandatory field. Sec. 14 UStG wants either a date
-- or a period, so both shapes are here; the editor offers one or the other.
--
-- The recipient block is a snapshot, not a lookup. An invoice has to keep the name and address it
-- was issued to even after the contact moves, which is the same rule that stops a contact being
-- deleted once it has been invoiced.

create type invoice_tax_scheme as enum (
  'domestic_taxable',
  'domestic_exempt',
  'reverse_charge_13b',
  'eu_b2b',
  'export_non_eu'
);

alter table invoices
  -- Sec. 14 UStG: the date of supply, or the period it covers. Nullable because every existing
  -- row predates the column; the editor requires one for anything issued from now on.
  add column delivery_date date,
  add column service_period_start date,
  add column service_period_end date,

  add column subject text,
  add column reference text,

  -- Which VAT treatment applies. Drives the note the document has to print: a reverse-charge
  -- invoice must say so, and an exempt one must cite why.
  add column tax_scheme invoice_tax_scheme not null default 'domestic_taxable',

  add column payment_method payment_method not null default 'bank_transfer',
  add column language char(2) not null default 'de',
  add column cost_center_id uuid references cost_centers(id) on delete set null,
  add column contact_person_user_id uuid references users(id) on delete set null,

  -- Skonto: the early-payment window and the rate inside it. Copied from the contact's own terms
  -- when the invoice is raised, then editable per invoice.
  add column skonto_days integer,
  add column skonto_percent numeric(5, 2),

  -- E-invoice (XRechnung) mode. Turning it on makes the recipient and their email mandatory,
  -- because the format has no way to address a document without them.
  add column e_invoice boolean not null default false,
  add column recipient_email text,

  -- The address as printed. Copied from the contact at issue time unless overridden.
  add column recipient_name text,
  add column recipient_address_line1 text,
  add column recipient_address_line2 text,
  add column recipient_postal_code text,
  add column recipient_city text,
  add column recipient_country_code char(2);

create index idx_invoices_delivery_date on invoices (company_id, delivery_date);
