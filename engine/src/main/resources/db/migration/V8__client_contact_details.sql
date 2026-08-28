-- Multiple labelled ways to reach a contact.
--
-- A client rarely has exactly one phone and one email: there is an office line, a site mobile,
-- and often a separate address that invoices must go to. Single columns cannot express that, and
-- "which address do we bill?" is a question this product has to answer.

create type contact_detail_kind as enum ('phone', 'email', 'website');

create type contact_detail_label as enum (
  'work', 'mobile', 'fax', 'personal', 'billing', 'newsletter', 'other'
);

create table client_contact_details (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  kind contact_detail_kind not null,
  label contact_detail_label not null default 'work',
  value text not null,
  -- Display order within a kind. The first entry is treated as the primary one.
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_client_contact_details_client_id on client_contact_details(client_id);
create index idx_client_contact_details_company_id on client_contact_details(company_id);

-- clients.email and clients.phone stay as the primary values, because invoice delivery and the
-- PDF template already read them. They are kept in step with the first entry of each kind rather
-- than replaced, so nothing downstream has to change.
insert into client_contact_details (client_id, company_id, kind, label, value, position)
select id, company_id, 'email', 'work', email, 0
from clients
where email is not null and email <> '';

insert into client_contact_details (client_id, company_id, kind, label, value, position)
select id, company_id, 'phone', 'work', phone, 0
from clients
where phone is not null and phone <> '';
