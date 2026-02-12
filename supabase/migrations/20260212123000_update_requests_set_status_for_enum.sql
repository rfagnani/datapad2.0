create or replace function app.fn_requests_set_status(
  p_request_id text,
  p_status text,
  p_stage text default null
)
returns jsonb
language plpgsql
security definer
set search_path = app, public, auth, requests
as $$
declare
  v_source text;
  v_schema text;
  v_table text;
  v_id_col text;
  v_status_col text;
  v_status_udt_schema text;
  v_status_udt_name text;
  v_status_is_enum boolean := false;
  v_status_value_for_column text;
  v_status_token text;
  v_stage_col text;
  v_updated_col text;
  v_set_clauses text[] := '{}';
  v_is_partner_admin boolean := false;
  v_row jsonb;
  v_sql text;
  v_status_value text := nullif(trim(coalesce(p_status, '')), '');
  v_stage_value text := nullif(trim(coalesce(p_stage, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_request_id is null or length(trim(p_request_id)) = 0 then
    raise exception 'request id is required';
  end if;

  if v_status_value is null and v_stage_value is null then
    raise exception 'status or stage is required';
  end if;

  v_status_token := case
    when v_status_value is null then null
    else lower(replace(v_status_value, ' ', '_'))
  end;

  select exists (
    select 1
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.role_id in (1, 3)
  )
  into v_is_partner_admin;

  if not v_is_partner_admin then
    raise exception 'Not authorized to update requests';
  end if;

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
      into v_id_col
    from information_schema.columns c
    where c.table_schema = v_schema
      and c.table_name = v_table
      and c.column_name in ('id', 'request_id', 'request_uuid')
    order by case c.column_name
      when 'id' then 1
      when 'request_id' then 2
      else 3
    end
    limit 1;

    continue when v_id_col is null;

    select c.column_name
      into v_status_col
    from information_schema.columns c
    where c.table_schema = v_schema
      and c.table_name = v_table
      and c.column_name in ('status', 'Status', 'request_status', 'state')
    order by case c.column_name
      when 'status' then 1
      when 'Status' then 2
      when 'request_status' then 3
      else 4
    end
    limit 1;

    if v_status_col is not null then
      select c.udt_schema, c.udt_name, (c.data_type = 'USER-DEFINED')
        into v_status_udt_schema, v_status_udt_name, v_status_is_enum
      from information_schema.columns c
      where c.table_schema = v_schema
        and c.table_name = v_table
        and c.column_name = v_status_col
      limit 1;
    else
      v_status_udt_schema := null;
      v_status_udt_name := null;
      v_status_is_enum := false;
    end if;

    select c.column_name
      into v_stage_col
    from information_schema.columns c
    where c.table_schema = v_schema
      and c.table_name = v_table
      and c.column_name in ('stage', 'current_stage', 'progress_stage')
    order by case c.column_name
      when 'stage' then 1
      when 'current_stage' then 2
      else 3
    end
    limit 1;

    select c.column_name
      into v_updated_col
    from information_schema.columns c
    where c.table_schema = v_schema
      and c.table_name = v_table
      and c.column_name in ('updated_at', 'last_updated_at')
    order by case c.column_name
      when 'updated_at' then 1
      else 2
    end
    limit 1;

    v_set_clauses := '{}';

    if v_status_value is not null and v_status_col is not null then
      v_status_value_for_column := v_status_value;

      if v_status_is_enum then
        select e.enumlabel
          into v_status_value_for_column
        from pg_type t
          join pg_namespace n on n.oid = t.typnamespace
          join pg_enum e on e.enumtypid = t.oid
        where n.nspname = v_status_udt_schema
          and t.typname = v_status_udt_name
          and lower(e.enumlabel) = lower(v_status_value)
        limit 1;

        if v_status_value_for_column is null and v_status_token is not null then
          if v_status_token ~ 'approve' then
            select e.enumlabel
              into v_status_value_for_column
            from pg_type t
              join pg_namespace n on n.oid = t.typnamespace
              join pg_enum e on e.enumtypid = t.oid
            where n.nspname = v_status_udt_schema
              and t.typname = v_status_udt_name
              and lower(e.enumlabel) = 'approved'
            limit 1;
          elsif v_status_token ~ 'reject|declin|deny|cancel' then
            select e.enumlabel
              into v_status_value_for_column
            from pg_type t
              join pg_namespace n on n.oid = t.typnamespace
              join pg_enum e on e.enumtypid = t.oid
            where n.nspname = v_status_udt_schema
              and t.typname = v_status_udt_name
              and lower(e.enumlabel) = 'rejected'
            limit 1;
          elsif v_status_token ~ 'pending|review|queue' then
            select e.enumlabel
              into v_status_value_for_column
            from pg_type t
              join pg_namespace n on n.oid = t.typnamespace
              join pg_enum e on e.enumtypid = t.oid
            where n.nspname = v_status_udt_schema
              and t.typname = v_status_udt_name
              and lower(e.enumlabel) = 'pending'
            limit 1;
          end if;
        end if;

        if v_status_value_for_column is null then
          raise exception 'Invalid status "%" for enum %.%', v_status_value, v_status_udt_schema, v_status_udt_name;
        end if;
      elsif v_status_token is not null then
        if v_status_token ~ 'approve' then
          v_status_value_for_column := 'approved';
        elsif v_status_token ~ 'reject|declin|deny|cancel' then
          v_status_value_for_column := 'rejected';
        elsif v_status_token ~ 'pending|review|queue' then
          v_status_value_for_column := 'pending';
        end if;
      end if;

      v_set_clauses := array_append(v_set_clauses, format('%I = %L', v_status_col, v_status_value_for_column));
    end if;

    if v_stage_value is not null and v_stage_col is not null then
      v_set_clauses := array_append(v_set_clauses, format('%I = %L', v_stage_col, v_stage_value));
    end if;

    if v_updated_col is not null then
      v_set_clauses := array_append(v_set_clauses, format('%I = now()', v_updated_col));
    end if;

    continue when array_length(v_set_clauses, 1) is null;

    v_sql := format(
      'update %s as r set %s where r.%I::text = %L returning to_jsonb(r)',
      v_source,
      array_to_string(v_set_clauses, ', '),
      v_id_col,
      trim(p_request_id)
    );

    execute v_sql into v_row;

    if v_row is not null then
      return v_row || jsonb_build_object('_source_schema', v_schema, '_source_table', v_table);
    end if;
  end loop;

  return null;
end;
$$;

grant usage on schema app to authenticated;
grant usage on schema app to service_role;
grant execute on function app.fn_requests_set_status(text, text, text) to authenticated, service_role;
