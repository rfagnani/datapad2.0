do
$$
begin
  if not exists (
    select 1
    from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'app'
      and c.relname = 'license_requests'
      and c.relkind = 'r'
  ) then
    raise notice 'Table app.license_requests not found; skipping PartnerOps access policy grants';
    return;
  end if;

  execute 'grant select, update on table app.license_requests to authenticated';
  execute 'grant select, update on table app.license_requests to service_role';

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'app'
      and tablename = 'license_requests'
      and policyname = 'license_requests_select_partnerops_admin'
  ) then
    execute $policy$
      create policy "license_requests_select_partnerops_admin"
        on app.license_requests
        for select
        to authenticated
        using (
          exists (
            select 1
            from public.users u
            where u.auth_user_id = auth.uid()
              and u.role_id in (1, 3)
          )
        )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'app'
      and tablename = 'license_requests'
      and policyname = 'license_requests_update_partnerops_admin'
  ) then
    execute $policy$
      create policy "license_requests_update_partnerops_admin"
        on app.license_requests
        for update
        to authenticated
        using (
          exists (
            select 1
            from public.users u
            where u.auth_user_id = auth.uid()
              and u.role_id in (1, 3)
          )
        )
        with check (
          exists (
            select 1
            from public.users u
            where u.auth_user_id = auth.uid()
              and u.role_id in (1, 3)
          )
        )
    $policy$;
  end if;
end
$$;
