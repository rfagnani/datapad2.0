create or replace function app.fn_support_analytics_has_access(
  p_company_mapping_id bigint default null
)
returns boolean
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_company bigint;
  v_user_role_id integer;
  v_target_company bigint;
  v_has_access boolean := false;
begin
  if auth.uid() is null then
    return false;
  end if;

  if to_regclass('public.company_mappings') is null then
    return false;
  end if;

  select u.company_id, u.role_id
  into v_user_company, v_user_role_id
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;

  if v_user_role_id is null or v_user_role_id not in (1, 2, 3) then
    return false;
  end if;

  if v_user_role_id in (1, 3) then
    v_target_company := p_company_mapping_id;
  else
    v_target_company := coalesce(p_company_mapping_id, v_user_company);

    if v_target_company is null then
      return false;
    end if;

    if v_user_company is not null and v_target_company <> v_user_company then
      return false;
    end if;
  end if;

  select exists (
    select 1
    from public.company_mappings cm
    where (v_target_company is null or cm.id = v_target_company)
      and nullif(btrim(coalesce(to_jsonb(cm)->>'company_name_fresh', '')), '') is not null
  )
  into v_has_access;

  return v_has_access;
end;
$$;

grant usage on schema app to authenticated;
grant usage on schema app to service_role;
grant execute on function app.fn_support_analytics_has_access(bigint) to authenticated, service_role;
