-- Structured name parts for individual clients.
--
-- A person is not one "name" string: an invoice addressed to "Frau Dr. Erika Mustermann" needs
-- salutation, title, given and family name kept apart, and German invoices in particular are
-- addressed formally. Storing only the joined string makes those parts unrecoverable.
--
-- `name` stays the required display name and remains what documents render, so existing invoices
-- and PDFs are unaffected. For a person it is composed from the parts below.

alter table clients
  add column salutation text,
  add column academic_title text,
  add column first_name text,
  add column last_name text,
  add column name_suffix text,
  -- The person's role at the organisation they belong to, e.g. "Head of procurement".
  add column position text;
