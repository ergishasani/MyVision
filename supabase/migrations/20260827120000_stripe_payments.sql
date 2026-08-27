-- Stripe Checkout support: external payment references plus webhook idempotency.
-- The payment_method enum already carries 'stripe' from V1, so no enum change is needed.

alter table payments
  add column stripe_payment_intent_id text,
  add column stripe_checkout_session_id text;

-- A PaymentIntent settles exactly once. Stripe retries a webhook until it gets a
-- 2xx, so this partial unique index is the last line of defence against a replay
-- recording the same money twice.
create unique index payments_stripe_payment_intent_unique
  on payments (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

alter table invoices
  add column stripe_checkout_session_id text,
  add column stripe_payment_intent_id text;

create index idx_invoices_stripe_checkout_session_id
  on invoices (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- Every webhook event we have already acted on. Checked before handling so a
-- redelivered event is acknowledged without being applied a second time.
create table stripe_events (
  id text primary key,
  type text not null,
  company_id uuid references companies(id) on delete set null,
  invoice_id uuid references invoices(id) on delete set null,
  processed_at timestamptz not null default now()
);

create index idx_stripe_events_invoice_id on stripe_events(invoice_id);
