-- Ensure authenticated portal admins can call overview RPCs from the app schema.
do
$$
declare
  schema_exists boolean;
  fn_exists boolean;
begin
  select exists (
    select 1
    from pg_namespace
    where nspname = 'app'
  )
  into schema_exists;

  if not schema_exists then
    raise notice 'Schema "app" not found; skipping admin overview grants';
    return;
  end if;

  execute 'grant usage on schema app to authenticated';
  execute 'grant usage on schema app to service_role';

  select exists (
    select 1
    from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname = 'fn_portal_admin_overview'
      and pg_get_function_identity_arguments(p.oid) = ''
  )
  into fn_exists;

  if fn_exists then
    execute 'alter function app.fn_portal_admin_overview() security definer';
    execute 'grant execute on function app.fn_portal_admin_overview() to authenticated';
    execute 'grant execute on function app.fn_portal_admin_overview() to service_role';
  else
    raise notice 'Function app.fn_portal_admin_overview() not found; skipping execute grants';
  end if;
end
$$;
