-- Product catalogue: reusable priced lines for quotes and invoices.

-- An article is a thing delivered, a service is work performed. The split is not cosmetic: it
-- drives the default revenue account and matters for reverse charge on cross-border work.
create type product_category as enum ('article', 'service');

-- The units a line can be sold in. An enum rather than free text so the same unit prints
-- identically on every document; German abbreviations are applied in the UI layer.
create type product_unit as enum (
  'pcs',          -- Stk
  'lump_sum',     -- Pauschal
  'hour',         -- Std
  'percent',      -- %
  'day',          -- Tag(e)
  'sqm',          -- m²
  'meter',        -- m
  'kg',
  'tonne',        -- t
  'linear_meter', -- lfm
  'cbm',          -- m³
  'km',
  'litre'         -- L
);

create table products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,

  -- Unique within the company, assigned from a counter like customer numbers are.
  article_number integer,

  name text not null,
  category product_category not null default 'article',
  unit product_unit not null default 'pcs',

  -- Not an enum: VAT rates are set by law and change (Germany ran 16%/5% through late 2020).
  -- A rate change must not require a migration.
  tax_rate numeric(5, 2) not null default 19,

  -- Net is the only price stored. Gross is always derived as net * (1 + tax_rate/100).
  --
  -- Storing both invites them to drift: a rounding difference or an edit to one and not the
  -- other leaves two contradictory prices with nothing to say which is right. German invoices
  -- are computed from net plus VAT anyway, so net is the figure with legal standing. The form
  -- lets you type either and converts, but only this column is persisted.
  selling_price_net numeric(12, 2) not null default 0,

  -- What we pay for it. Nullable: plenty of services have no purchase price at all, and 0 would
  -- claim a known cost of zero rather than an unknown one.
  purchase_price_net numeric(12, 2),

  description text,
  internal_note text,

  -- Stock tracking is a paid add-on in the product this mirrors. The flag records the intent;
  -- no stock levels are kept yet.
  inventory_enabled boolean not null default false,

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_tax_rate_range check (tax_rate >= 0 and tax_rate <= 100),
  constraint products_selling_price_positive check (selling_price_net >= 0),
  constraint products_purchase_price_positive
    check (purchase_price_net is null or purchase_price_net >= 0)
);

create index idx_products_company_id on products(company_id);

-- Partial, like the contact equivalent: only assigned numbers take part in the uniqueness rule.
create unique index products_article_number_unique
  on products(company_id, article_number)
  where article_number is not null;

-- Alternative units for the same product: a pack of 10, a pallet of 500. The factor says how
-- many standard units one of these equals, and the price follows from it rather than being
-- typed separately — so changing the base price cannot leave a stale pack price behind.
create table product_units (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  unit product_unit not null,
  factor numeric(12, 4) not null default 1,
  position integer not null default 0,
  created_at timestamptz not null default now(),

  -- A zero or negative factor would make the derived price meaningless.
  constraint product_units_factor_positive check (factor > 0)
);

create index idx_product_units_product_id on product_units(product_id);
create index idx_product_units_company_id on product_units(company_id);

-- The counter behind article numbers. Starts at 1000 for the same reason customer numbers do.
alter table companies
  add column next_article_number integer not null default 1000;
