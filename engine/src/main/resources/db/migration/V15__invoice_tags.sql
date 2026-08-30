-- Free-form labels on an invoice.
--
-- A Postgres array rather than a join table: tags are a small, unordered set read only with the
-- invoice they belong to, and never queried across invoices in a way that would want an index on
-- the tag itself. A join table would be three more files for no gain.
--
-- Deliberately editable after an invoice is issued. Tags are the operator's own filing labels,
-- not part of the document — locking them when the invoice locks would make them useless, since
-- the moment you most want to file something is after it has gone out.

alter table invoices
  add column tags text[] not null default '{}';
