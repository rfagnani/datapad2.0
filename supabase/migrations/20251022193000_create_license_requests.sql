create extension if not exists "pgcrypto";

create schema if not exists app;

create sequence if not exists app.license_request_code_seq;

create or replace function app.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists app.license_requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('LR-' || lpad(nextval('app.license_request_code_seq')::text, 6, '0')),
  requester_id uuid not null references auth.users(id) on delete cascade,
  company_mapping_id text not null,
  entitlement_name text not null,
  sku_display_name text not null,
  current_offer_name text,
  quantity integer not null check (quantity > 0),
  total_price numeric(12, 2),
  currency text,
  status text not null default 'submitted',
  stage text not null default 'sent',
  priority text not null default 'normal',
  department text,
  justification text,
  estimated_completion_date timestamptz,
  evaluation_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_license_requests_updated_at'
  ) then
    create trigger set_license_requests_updated_at
    before update on app.license_requests
    for each row
    execute function app.tg_set_updated_at();
  end if;
end;
$$;

alter table app.license_requests enable row level security;

create policy "license_requests_insert_own"
  on app.license_requests
  for insert
  to authenticated
  with check (requester_id = auth.uid());

create policy "license_requests_select_own"
  on app.license_requests
  for select
  to authenticated
  using (requester_id = auth.uid());

create or replace function app.fn_create_request(
  p_company_id text,
  p_entitlement_name text,
  p_current_offer_name text,
  p_sku_display_name text,
  p_quantity integer,
  p_total_price numeric,
  p_currency text,
  p_department text default null,
  p_justification text default null
)
returns table (
  request_id uuid,
  request_code text,
  status text,
  stage text,
  priority text,
  department text,
  estimated_completion_date timestamptz,
  created_at timestamptz,
  evaluation_started_at timestamptz,
  quantity integer,
  total_price numeric,
  currency text,
  justification text
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_request app.license_requests;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_company_id is null or length(trim(p_company_id)) = 0 then
    raise exception 'company id is required';
  end if;

  if p_entitlement_name is null or length(trim(p_entitlement_name)) = 0 then
    raise exception 'entitlement name is required';
  end if;

  if p_sku_display_name is null or length(trim(p_sku_display_name)) = 0 then
    raise exception 'sku display name is required';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be greater than zero';
  end if;

  insert into app.license_requests (
    requester_id,
    company_mapping_id,
    entitlement_name,
    current_offer_name,
    sku_display_name,
    quantity,
    total_price,
    currency,
    department,
    justification
  ) values (
    auth.uid(),
    trim(p_company_id),
    trim(p_entitlement_name),
    nullif(trim(p_current_offer_name), ''),
    trim(p_sku_display_name),
    p_quantity,
    p_total_price,
    nullif(trim(p_currency), ''),
    nullif(trim(p_department), ''),
    nullif(trim(p_justification), '')
  )
  returning * into v_request;

  return query
  select
    v_request.id,
    v_request.code,
    v_request.status,
    v_request.stage,
    v_request.priority,
    v_request.department,
    v_request.estimated_completion_date,
    v_request.created_at,
    v_request.evaluation_started_at,
    v_request.quantity,
    v_request.total_price,
    v_request.currency,
    v_request.justification;
end;
$$;

grant usage on schema app to authenticated;
grant insert, select on app.license_requests to authenticated;
grant execute on function app.fn_create_request(
  text,
  text,
  text,
  text,
  integer,
  numeric,
  text,
  text,
  text
) to authenticated;
