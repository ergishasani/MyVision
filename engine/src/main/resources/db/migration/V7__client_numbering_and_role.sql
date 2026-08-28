-- Customer numbers, contact role, and the accounting reference numbers.

-- What kind of relationship this contact is. Mirrors the filter tabs on the contact list.
create type contact_role as enum ('customer', 'supplier', 'partner', 'prospect');

alter table clients
  add column contact_role contact_role not null default 'customer',
  add column customer_number integer,
  -- Free text, not integers: an accountant's debtor and creditor references follow their own
  -- account plan (SKR03/SKR04) and are not ours to generate or validate.
  add column debtor_number text,
  add column creditor_number text;

-- A customer number identifies the contact on documents and in the accountant's books, so it has
-- to be unique within the company. Partial index: numbers are only assigned once a contact has
-- one, and archived rows keep theirs.
create unique index clients_customer_number_unique
  on clients (company_id, customer_number)
  where customer_number is not null;

-- The counter behind assignment. Starts at 1000 so the first customer numbers look like account
-- references rather than "1".
alter table companies
  add column next_customer_number integer not null default 1000;

-- Existing contacts predate numbering; give them numbers in creation order so the column is
-- usable immediately rather than mostly null.
with numbered as (
  select id,
         company_id,
         999 + row_number() over (partition by company_id order by created_at, id) as assigned
  from clients
)
update clients
set customer_number = numbered.assigned
from numbered
where clients.id = numbered.id;

-- Move each company's counter past whatever was just handed out.
update companies
set next_customer_number = coalesce(
  (select max(customer_number) + 1 from clients where clients.company_id = companies.id),
  1000
);
