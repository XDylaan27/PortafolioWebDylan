-- Requires the existing friend_order_reminders table; this is an incremental migration.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.order_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  endpoint text not null unique check (
    length(endpoint) <= 2048 and endpoint ~ '^https://(fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com|web[.]push[.]apple[.]com|[a-z0-9.-]+[.]notify[.]windows[.]com)/'
  ),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{87}={0,1}$'),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]{22}={0,2}$'),
  updated_at timestamptz not null default now(),
  last_test_at timestamptz
);
create index order_push_subscriptions_user_id_idx on public.order_push_subscriptions(user_id);
alter table public.order_push_subscriptions enable row level security;
revoke all on public.order_push_subscriptions from anon, authenticated;
grant select, insert, delete on public.order_push_subscriptions to authenticated;
grant update (user_id, endpoint, p256dh, auth, updated_at) on public.order_push_subscriptions to authenticated;
grant all on public.order_push_subscriptions to service_role;
create policy "Own push subscriptions" on public.order_push_subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table public.order_push_deliveries (
  reminder_id uuid not null references public.friend_order_reminders(id) on delete cascade,
  subscription_id uuid not null references public.order_push_subscriptions(id) on delete cascade,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  lease_token uuid,
  primary key (reminder_id, subscription_id, scheduled_for)
);
alter table public.order_push_deliveries enable row level security;
revoke all on public.order_push_deliveries from public, anon, authenticated;
grant all on public.order_push_deliveries to service_role;
create index order_push_deliveries_subscription_idx on public.order_push_deliveries(subscription_id);
create index friend_order_reminders_pending_idx on public.friend_order_reminders(remind_at) where not notified;

-- Reprogramar invalida los envíos anteriores, incluso si se mantiene la misma hora.
create function private.reset_order_push_deliveries() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not new.notified and (
    old.remind_at is distinct from new.remind_at or old.note is distinct from new.note
    or old.friend_id is distinct from new.friend_id or old.notified
  ) then
    delete from public.order_push_deliveries where reminder_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.reset_order_push_deliveries() from public, anon, authenticated;
create trigger reset_order_push_deliveries after update on public.friend_order_reminders
  for each row execute function private.reset_order_push_deliveries();

-- Vault access is isolated: the full configuration is available only to the service role.
create function public.get_order_push_config() returns jsonb
language sql security definer set search_path = '' as $$
  select decrypted_secret::jsonb from vault.decrypted_secrets where name = 'order_push_config';
$$;
revoke all on function public.get_order_push_config() from public, anon, authenticated;
grant execute on function public.get_order_push_config() to service_role;

create function public.get_order_push_public_key() returns text
language sql security definer set search_path = '' as $$
  select decrypted_secret::jsonb ->> 'public_key' from vault.decrypted_secrets
  where name = 'order_push_config' and (select auth.uid()) is not null;
$$;
revoke all on function public.get_order_push_public_key() from public, anon;
grant execute on function public.get_order_push_public_key() to authenticated;

-- Runs as the service role (not SECURITY DEFINER). Each device has an independent delivery.
create function public.claim_order_push_deliveries() returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  insert into public.order_push_deliveries (reminder_id, subscription_id, scheduled_for)
  select r.id, s.id, r.remind_at
  from public.friend_order_reminders r
  join public.order_push_subscriptions s on s.user_id = r.user_id
  where not r.notified and r.remind_at <= now()
  on conflict do nothing;

  with pending as (
    select d.reminder_id, d.subscription_id, d.scheduled_for
    from public.order_push_deliveries d
    join public.friend_order_reminders r on r.id = d.reminder_id and r.remind_at = d.scheduled_for
    where not r.notified and r.remind_at <= now() and d.sent_at is null
      and d.next_attempt_at <= now() and (d.locked_until is null or d.locked_until < now())
    order by d.scheduled_for limit 25 for update of d skip locked
  ), claimed as (
    update public.order_push_deliveries d
    set locked_until = now() + interval '2 minutes', lease_token = gen_random_uuid(), attempts = attempts + 1
    from pending p
    where d.reminder_id = p.reminder_id and d.subscription_id = p.subscription_id and d.scheduled_for = p.scheduled_for
    returning d.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'reminder_id', c.reminder_id, 'subscription_id', c.subscription_id,
    'scheduled_for', c.scheduled_for, 'lease_token', c.lease_token,
    'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth,
    'user_id', r.user_id, 'note', r.note, 'friend_name', f.name
  )), '[]'::jsonb) into result
  from claimed c join public.order_push_subscriptions s on s.id = c.subscription_id
  join public.friend_order_reminders r on r.id = c.reminder_id
  left join public.friend_contacts f on f.id = r.friend_id and f.user_id = r.user_id;
  return result;
end;
$$;
revoke all on function public.claim_order_push_deliveries() from public, anon, authenticated;
grant execute on function public.claim_order_push_deliveries() to service_role;

create function public.complete_order_push_delivery(
  p_reminder_id uuid, p_subscription_id uuid, p_scheduled_for timestamptz,
  p_lease_token uuid, p_success boolean, p_expired boolean default false
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.order_push_deliveries set
    sent_at = case when p_success then now() else null end,
    locked_until = null,
    next_attempt_at = now() + make_interval(secs => least(3600, 60 * power(2, least(attempts, 6))::integer))
  where reminder_id = p_reminder_id and subscription_id = p_subscription_id
    and scheduled_for = p_scheduled_for and lease_token = p_lease_token;
  if not found then return; end if;
  if p_expired then delete from public.order_push_subscriptions where id = p_subscription_id; end if;

  update public.friend_order_reminders r set notified = true
  where r.id = p_reminder_id and r.remind_at = p_scheduled_for and not r.notified
    and exists (select 1 from public.order_push_subscriptions s where s.user_id = r.user_id)
    and not exists (
      select 1 from public.order_push_subscriptions s
      left join public.order_push_deliveries d on d.subscription_id = s.id
        and d.reminder_id = r.id and d.scheduled_for = r.remind_at
      where s.user_id = r.user_id and d.sent_at is null
    );
end;
$$;
revoke all on function public.complete_order_push_delivery(uuid,uuid,timestamptz,uuid,boolean,boolean) from public, anon, authenticated;
grant execute on function public.complete_order_push_delivery(uuid,uuid,timestamptz,uuid,boolean,boolean) to service_role;

create function private.dispatch_order_reminders() returns bigint
language plpgsql security definer set search_path = '' as $$
declare config jsonb;
begin
  if not exists (
    select 1 from public.friend_order_reminders r
    join public.order_push_subscriptions s on s.user_id = r.user_id
    where not r.notified and r.remind_at <= now()
  ) then return null; end if;
  select decrypted_secret::jsonb into config from vault.decrypted_secrets where name = 'order_push_config';
  if config is null then return null; end if;
  return net.http_post(
    url := config ->> 'function_url',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', config ->> 'cron_secret'),
    body := '{"action":"dispatch"}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;
revoke all on function private.dispatch_order_reminders() from public, anon, authenticated;

select cron.schedule('order-reminders-web-push', '* * * * *', 'select private.dispatch_order_reminders();');
