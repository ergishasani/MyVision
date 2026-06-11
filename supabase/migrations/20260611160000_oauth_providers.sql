create type auth_provider as enum ('local', 'google', 'apple');

alter table users
  add column auth_provider auth_provider not null default 'local',
  add column provider_subject text,
  alter column password_hash drop not null;

create unique index users_provider_identity_unique
  on users (auth_provider, provider_subject)
  where provider_subject is not null;
