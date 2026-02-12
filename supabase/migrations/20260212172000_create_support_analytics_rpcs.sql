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

  if to_regclass('public.freshservices_enriched_tickets') is null or to_regclass('public.company_mappings') is null then
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
    from public.freshservices_enriched_tickets t
    join public.company_mappings cm
      on coalesce(
           to_jsonb(cm)->>'department_id',
           to_jsonb(cm)->>'freshservice_department_id',
           to_jsonb(cm)->>'freshservices_department_id'
         ) = t.ticket_department_id::text
    where v_target_company is null or cm.id = v_target_company
  )
  into v_has_access;

  return v_has_access;
end;
$$;

create or replace function app.fn_support_analytics_summary(
  p_months integer default 6,
  p_company_mapping_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_company bigint;
  v_user_role_id integer;
  v_target_company bigint;
  v_months integer := least(greatest(coalesce(p_months, 6), 1), 24);
  v_since timestamptz := date_trunc('month', now()) - make_interval(months => least(greatest(coalesce(p_months, 6), 1), 24) - 1);
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if to_regclass('public.freshservices_enriched_tickets') is null or to_regclass('public.company_mappings') is null then
    return jsonb_build_object(
      'total_tickets', 0,
      'avg_response_hours', null,
      'resolution_rate', null,
      'reseller_name', null,
      'monthly', '[]'::jsonb,
      'categories', '[]'::jsonb,
      'response_metrics', '[]'::jsonb
    );
  end if;

  select u.company_id, u.role_id
  into v_user_company, v_user_role_id
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;

  if v_user_role_id is null or v_user_role_id not in (1, 2, 3) then
    raise exception 'Not authorized to read support analytics';
  end if;

  if v_user_role_id in (1, 3) then
    v_target_company := p_company_mapping_id;
  else
    v_target_company := coalesce(p_company_mapping_id, v_user_company);
    if v_target_company is null then
      raise exception 'Company scope not found for user';
    end if;
    if v_user_company is not null and v_target_company <> v_user_company then
      raise exception 'Not authorized for the requested company';
    end if;
  end if;

  with scoped_tickets as (
    select
      t.*,
      cm.id as company_mapping_id,
      coalesce(
        to_jsonb(cm)->>'company_name_reseller',
        to_jsonb(cm)->>'company_name_hub',
        to_jsonb(cm)->>'company_name'
      ) as reseller_name,
      greatest(extract(epoch from (coalesce(t.ticket_updated_at, t.ticket_created_at) - t.ticket_created_at)) / 3600.0, 0) as response_hours,
      case
        when lower(coalesce(t.ticket_custom_priority, '')) in ('low', 'medium', 'high', 'critical')
          then initcap(lower(t.ticket_custom_priority))
        when t.ticket_priority = 1 then 'Low'
        when t.ticket_priority = 2 then 'Medium'
        when t.ticket_priority = 3 then 'High'
        when t.ticket_priority = 4 then 'Critical'
        else coalesce(initcap(lower(nullif(t.ai_urgency_level, ''))), 'Medium')
      end as urgency_level
    from public.freshservices_enriched_tickets t
    join public.company_mappings cm
      on coalesce(
           to_jsonb(cm)->>'department_id',
           to_jsonb(cm)->>'freshservice_department_id',
           to_jsonb(cm)->>'freshservices_department_id'
         ) = t.ticket_department_id::text
    where (v_target_company is null or cm.id = v_target_company)
      and t.ticket_created_at >= v_since
  ),
  totals as (
    select
      count(*)::int as total_tickets,
      avg(response_hours)::numeric as avg_response_hours,
      (
        100.0 * sum(case when ticket_status in (4, 5) then 1 else 0 end)
        / nullif(count(*), 0)
      )::numeric as resolution_rate,
      max(reseller_name) as reseller_name
    from scoped_tickets
  ),
  monthly as (
    select jsonb_agg(
      jsonb_build_object(
        'period', to_char(month_bucket, 'YYYY-MM'),
        'label', to_char(month_bucket, 'Mon YY'),
        'total', total
      )
      order by month_bucket
    ) as data
    from (
      select
        date_trunc('month', ticket_created_at) as month_bucket,
        count(*)::int as total
      from scoped_tickets
      group by 1
      order by 1
    ) m
  ),
  categories as (
    select jsonb_agg(
      jsonb_build_object(
        'category', category,
        'total', total
      )
      order by total desc, category
    ) as data
    from (
      select
        coalesce(nullif(ticket_category, ''), nullif(ai_main_category, ''), 'Uncategorized') as category,
        count(*)::int as total
      from scoped_tickets
      group by 1
    ) c
  ),
  response_metrics as (
    select jsonb_agg(
      jsonb_build_object(
        'urgency', urgency,
        'avg_hours', avg_hours,
        'target_hours', target_hours
      )
      order by sort_order
    ) as data
    from (
      select
        u.urgency,
        round(avg(st.response_hours)::numeric, 2) as avg_hours,
        u.target_hours,
        u.sort_order
      from (values
        ('Low'::text, 24::numeric, 1::int),
        ('Medium'::text, 8::numeric, 2::int),
        ('High'::text, 2::numeric, 3::int),
        ('Critical'::text, 1::numeric, 4::int)
      ) as u(urgency, target_hours, sort_order)
      left join scoped_tickets st on st.urgency_level = u.urgency
      group by u.urgency, u.target_hours, u.sort_order
      order by u.sort_order
    ) rm
  )
  select jsonb_build_object(
    'months', v_months,
    'total_tickets', coalesce(t.total_tickets, 0),
    'avg_response_hours', case when t.avg_response_hours is null then null else round(t.avg_response_hours, 2) end,
    'resolution_rate', case when t.resolution_rate is null then null else round(t.resolution_rate, 2) end,
    'reseller_name', t.reseller_name,
    'monthly', coalesce(m.data, '[]'::jsonb),
    'categories', coalesce(c.data, '[]'::jsonb),
    'response_metrics', coalesce(rm.data, '[]'::jsonb)
  )
  into v_result
  from totals t
  cross join monthly m
  cross join categories c
  cross join response_metrics rm;

  return coalesce(v_result, jsonb_build_object(
    'months', v_months,
    'total_tickets', 0,
    'avg_response_hours', null,
    'resolution_rate', null,
    'reseller_name', null,
    'monthly', '[]'::jsonb,
    'categories', '[]'::jsonb,
    'response_metrics', '[]'::jsonb
  ));
end;
$$;

create or replace function app.fn_support_analytics_tickets(
  p_months integer default 6,
  p_limit integer default 20,
  p_status integer default null,
  p_company_mapping_id bigint default null
)
returns setof jsonb
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_company bigint;
  v_user_role_id integer;
  v_target_company bigint;
  v_months integer := least(greatest(coalesce(p_months, 6), 1), 24);
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 200);
  v_since timestamptz := date_trunc('month', now()) - make_interval(months => least(greatest(coalesce(p_months, 6), 1), 24) - 1);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if to_regclass('public.freshservices_enriched_tickets') is null or to_regclass('public.company_mappings') is null then
    return;
  end if;

  select u.company_id, u.role_id
  into v_user_company, v_user_role_id
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;

  if v_user_role_id is null or v_user_role_id not in (1, 2, 3) then
    raise exception 'Not authorized to read support analytics';
  end if;

  if v_user_role_id in (1, 3) then
    v_target_company := p_company_mapping_id;
  else
    v_target_company := coalesce(p_company_mapping_id, v_user_company);
    if v_target_company is null then
      raise exception 'Company scope not found for user';
    end if;
    if v_user_company is not null and v_target_company <> v_user_company then
      raise exception 'Not authorized for the requested company';
    end if;
  end if;

  return query
  with scoped_tickets as (
    select
      t.*,
      cm.id as company_mapping_id,
      coalesce(
        to_jsonb(cm)->>'company_name_reseller',
        to_jsonb(cm)->>'company_name_hub',
        to_jsonb(cm)->>'company_name'
      ) as reseller_name
    from public.freshservices_enriched_tickets t
    join public.company_mappings cm
      on coalesce(
           to_jsonb(cm)->>'department_id',
           to_jsonb(cm)->>'freshservice_department_id',
           to_jsonb(cm)->>'freshservices_department_id'
         ) = t.ticket_department_id::text
    where (v_target_company is null or cm.id = v_target_company)
      and t.ticket_created_at >= v_since
      and (p_status is null or t.ticket_status = p_status)
  )
  select jsonb_build_object(
    'ticket_id', st.ticket_id,
    'subject', coalesce(nullif(st.ticket_subject, ''), 'Untitled'),
    'description', coalesce(nullif(st.ai_summary, ''), nullif(st.ticket_description_text, ''), ''),
    'category', coalesce(nullif(st.ticket_category, ''), nullif(st.ai_main_category, ''), 'Uncategorized'),
    'priority', coalesce(
      nullif(st.ticket_custom_priority, ''),
      case
        when st.ticket_priority = 1 then 'Low'
        when st.ticket_priority = 2 then 'Medium'
        when st.ticket_priority = 3 then 'High'
        when st.ticket_priority = 4 then 'Critical'
        else 'Unknown'
      end
    ),
    'status', case
      when st.ticket_status = 2 then 'Open'
      when st.ticket_status = 3 then 'Pending'
      when st.ticket_status = 4 then 'Resolved'
      when st.ticket_status = 5 then 'Closed'
      else concat('Status ', st.ticket_status::text)
    end,
    'status_code', st.ticket_status,
    'created_at', st.ticket_created_at,
    'updated_at', st.ticket_updated_at,
    'reseller_name', st.reseller_name,
    'department_id', st.ticket_department_id
  )
  from scoped_tickets st
  order by st.ticket_created_at desc
  limit v_limit;
end;
$$;

grant usage on schema app to authenticated;
grant usage on schema app to service_role;

grant execute on function app.fn_support_analytics_has_access(bigint) to authenticated, service_role;
grant execute on function app.fn_support_analytics_summary(integer, bigint) to authenticated, service_role;
grant execute on function app.fn_support_analytics_tickets(integer, integer, integer, bigint) to authenticated, service_role;
