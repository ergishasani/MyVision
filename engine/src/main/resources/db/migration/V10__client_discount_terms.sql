-- Discount terms agreed with a contact.
--
-- Two different things, easily confused:
--
--   Skonto (early-payment discount) — "2% if paid within 10 days". Conditional: it applies only
--   when the customer actually pays early, so it is not deducted when the invoice is issued.
--
--   Customer discount — a standing reduction this customer always gets, applied to the invoice
--   when it is written.
--
-- Both are stored here as agreed terms. Applying them to invoice totals is not implemented yet,
-- and doing so touches VAT: under German rules an early-payment discount that is taken changes
-- the taxable amount, so the correction has to reach the VAT return too. See
-- docs/invoice-compliance-checklist.md before wiring this into invoice arithmetic.

create type discount_unit as enum ('percent', 'absolute');

alter table clients
  -- Skonto: the period, and the rate that applies within it.
  add column discount_days integer,
  add column discount_percent numeric(5, 2),

  -- The standing customer discount, and whether it is a percentage or a fixed amount.
  add column customer_discount numeric(12, 2),
  add column customer_discount_unit discount_unit not null default 'percent';

alter table clients
  add constraint clients_discount_percent_range
    check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100)),
  add constraint clients_discount_days_positive
    check (discount_days is null or discount_days >= 0),
  add constraint clients_customer_discount_positive
    check (customer_discount is null or customer_discount >= 0);
