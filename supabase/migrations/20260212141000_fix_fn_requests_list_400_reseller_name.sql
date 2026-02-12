create or replace function app.fn_requests_list(
  p_limit integer default 100,
  p_requester_id uuid default null,
  p_include_all boolean default false
)
returns setof jsonb
language plpgsql
security definer
set search_path = app, public, auth, requests
as $$
declare
  v_source text;
  v_schema text;
  v_table text;
  v_requester_col text;
  v_created_col text;
  v_company_col text;
  v_include_all boolean := coalesce(p_include_all, false);
  v_company_mappings_exists boolean := to_regclass('public.company_mappings') is not null;
  v_target_user uuid;
  v_is_partner_admin boolean := false;
  v_limit integer := greatest(coalesce(p_limit, 100), 1);
  v_rows_emitted integer := 0;
  v_sql text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select exists (
    select 1
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.role_id in (1, 3)
  )
  into v_is_partner_admin;

  if v_include_all and not v_is_partner_admin then
    v_include_all := false;
  end if;

  v_target_user := coalesce(p_requester_id, auth.uid());

  for v_source in
    select source_name
    from (
      values ('requests.requests'::text), ('app.license_requests'::text)
    ) as sources(source_name)
  loop
    continue when to_regclass(v_source) is null;

    v_schema := split_part(v_source, '.', 1);
    v_table := split_part(v_source, '.', 2);

    select c.column_name
      into v_requester_col
    from information_schema.columns c
    where c.table_schema = v_schema
      and c.table_name = v_table
      and c.column_name in ('requester_id', 'user_id', 'auth_user_id')
    order by case c.column_name
      when 'requester_id' then 1
      when 'user_id' then 2
      else 3
    end
    limit 1;

    select c.column_name
      into v_created_col
    from information_schema.columns c
    where c.table_schema = v_schema
      and c.table_name = v_table
      and c.column_name in ('created_at', 'submitted_at', 'requested_at', 'updated_at')
    order by case c.column_name
      when 'created_at' then 1
      when 'submitted_at' then 2
      when 'requested_at' then 3
      else 4
    end
    limit 1;

    select c.column_name
      into v_company_col
    from information_schema.columns c
    where c.table_schema = v_schema
      and c.table_name = v_table
      and c.column_name in ('company_id', 'company_mapping_id')
    order by case c.column_name
      when 'company_id' then 1
      else 2
    end
    limit 1;

    if v_company_col is not null and v_company_mappings_exists then
      v_sql := format(
        'select to_jsonb(r) || jsonb_build_object(''_source_schema'', %L, ''_source_table'', %L, ''company_name_reseller'', to_jsonb(cm)->>''company_name_reseller'', ''company_name_hub'', to_jsonb(cm)->>''company_name_hub'', ''company_name'', coalesce(to_jsonb(cm)->>''company_name_reseller'', to_jsonb(cm)->>''company_name_hub'', to_jsonb(cm)->>''company_name'')) from %s r left join public.company_mappings cm on cm.id::text = r.%I::text',
        v_schema,
        v_table,
        v_source,
        v_company_col
      );
    else
      v_sql := format(
        'select to_jsonb(r) || jsonb_build_object(''_source_schema'', %L, ''_source_table'', %L) from %s r',
        v_schema,
        v_table,
        v_source
      );
    end if;

    if not v_include_all then
      if v_requester_col is null then
        continue;
      end if;
      v_sql := v_sql || format(' where r.%I::text = %L', v_requester_col, v_target_user::text);
    end if;

    if v_created_col is not null then
      v_sql := v_sql || format(' order by r.%I desc nulls last', v_created_col);
    end if;

    v_sql := v_sql || format(' limit %s', v_limit);

    return query execute v_sql;
    get diagnostics v_rows_emitted = row_count;

    if v_rows_emitted > 0 then
      return;
    end if;
  end loop;
end;
$$;

grant usage on schema app to authenticated;
grant usage on schema app to service_role;
grant execute on function app.fn_requests_list(integer, uuid, boolean) to authenticated, service_role;
