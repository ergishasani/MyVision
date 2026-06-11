insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('myvision-documents', 'myvision-documents', false, 10485760, array['application/pdf', 'application/xml']),
  ('myvision-public', 'myvision-public', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read access for MyVision public assets'
  ) then
    create policy "Public read access for MyVision public assets"
      on storage.objects
      for select
      using (bucket_id = 'myvision-public');
  end if;
end $$;
