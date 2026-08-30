-- Whose name the invoice is issued under: the business, or the person behind it.
--
-- A sole trader has no company name worth printing, but the supplier's full name stays mandatory
-- (docs/invoice-compliance-checklist.md, Sec. 14 UStG), so this picks *which* name is printed and
-- never removes it. With the flag off, the PDF letterhead, sender line and footer, and the
-- XRechnung SellerTradeParty, all carry the account owner's own name instead of the company's.
--
-- Defaults to true, so every invoice raised before this column existed keeps printing what it
-- printed at the time.

alter table invoices
  add column show_company_name boolean not null default true;
