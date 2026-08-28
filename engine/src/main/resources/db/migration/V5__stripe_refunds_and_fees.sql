-- Completes the Stripe payment feature: refunds, the processor's fee split, and a record of
-- failed payment attempts.

create table refunds (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  -- Nullable: a refund issued from the Stripe dashboard may not map onto a single stored payment.
  payment_id uuid references payments(id) on delete set null,
  amount numeric(12, 2) not null,
  currency char(3) not null default 'EUR',
  reason text,
  status text not null default 'pending',
  stripe_refund_id text,
  created_at timestamptz not null default now()
);

-- A Stripe refund applies once. Guards against a redelivered webhook reversing money twice.
create unique index refunds_stripe_refund_unique
  on refunds (stripe_refund_id)
  where stripe_refund_id is not null;

create index idx_refunds_invoice_id on refunds(invoice_id);
create index idx_refunds_company_id on refunds(company_id);

-- What Stripe kept. Captured best-effort from the charge's balance transaction, so both stay
-- null when the fee could not be read; the gross amount column is never affected.
alter table payments
  add column stripe_fee_amount numeric(12, 2),
  add column net_amount numeric(12, 2);

-- The most recent decline, so an operator can see why a card failed instead of only seeing that
-- the invoice is still unpaid.
alter table invoices
  add column last_payment_error text,
  add column last_payment_error_at timestamptz;
