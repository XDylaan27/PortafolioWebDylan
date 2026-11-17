create table public.push_topic_preferences (
  subscription_id uuid not null references public.order_push_subscriptions(id) on delete cascade,
  topic text not null check(topic in ('orders','cuenta-clara')),
  enabled boolean not null default true,
  enabled_since timestamptz not null default now(),
  primary key(subscription_id,topic)
);
alter table public.push_topic_preferences enable row level security;
revoke all on public.push_topic_preferences from anon,authenticated;
grant select on public.push_topic_preferences to authenticated;
grant all on public.push_topic_preferences to service_role;
create policy "Own device topic preferences" on public.push_topic_preferences for select to authenticated using(
  exists(select 1 from public.order_push_subscriptions s where s.id=subscription_id and s.user_id=(select auth.uid()))
);
insert into public.push_topic_preferences(subscription_id,topic) select id,'orders' from public.order_push_subscriptions;

create function private.set_push_topic(p_subscription_id uuid,p_topic text,p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.order_push_subscriptions where id=p_subscription_id and user_id=auth.uid()) then raise exception 'Dispositivo no disponible.'; end if;
  if p_topic not in ('orders','cuenta-clara') or p_enabled is null then raise exception 'Preferencia inválida.'; end if;
  if p_topic='cuenta-clara' and p_enabled and not private.cc_member() and not exists(select 1 from public.cc_join_requests where user_id=auth.uid()) then raise exception 'Solicita primero acceso a Cuenta Clara.'; end if;
  insert into public.push_topic_preferences(subscription_id,topic,enabled)
    values(p_subscription_id,p_topic,p_enabled)
  on conflict(subscription_id,topic) do update set enabled=excluded.enabled,
    enabled_since=case when excluded.enabled and not public.push_topic_preferences.enabled then now() else public.push_topic_preferences.enabled_since end;
end;
$$;
revoke all on function private.set_push_topic(uuid,text,boolean) from public,anon;
grant execute on function private.set_push_topic(uuid,text,boolean) to authenticated;
create function public.set_push_topic(p_subscription_id uuid,p_topic text,p_enabled boolean) returns void language sql security invoker set search_path='' as $$ select private.set_push_topic(p_subscription_id,p_topic,p_enabled); $$;
revoke all on function public.set_push_topic(uuid,text,boolean) from public,anon;
grant execute on function public.set_push_topic(uuid,text,boolean) to authenticated;

create view private.order_push_enabled_subscriptions with(security_invoker=true) as
  select s.* from public.order_push_subscriptions s where exists(
    select 1 from public.push_topic_preferences p where p.subscription_id=s.id and p.topic='orders' and p.enabled
  );
revoke all on private.order_push_enabled_subscriptions from public,anon,authenticated;
grant select on private.order_push_enabled_subscriptions to service_role;

create table public.cc_push_deliveries (
  event_id uuid not null references public.cc_events(id) on delete cascade,
  subscription_id uuid not null references public.order_push_subscriptions(id) on delete cascade,
  sent_at timestamptz,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  lease_token uuid,
  primary key(event_id,subscription_id)
);
create index cc_push_deliveries_subscription_idx on public.cc_push_deliveries(subscription_id);
alter table public.cc_push_deliveries enable row level security;
revoke all on public.cc_push_deliveries from public,anon,authenticated;
grant all on public.cc_push_deliveries to service_role;

create function public.claim_cc_push() returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  insert into public.cc_push_deliveries(event_id,subscription_id)
  select e.id,s.id from public.cc_events e
  join public.order_push_subscriptions s on s.user_id=e.user_id
  join public.push_topic_preferences p on p.subscription_id=s.id and p.topic='cuenta-clara' and p.enabled and e.created_at>=p.enabled_since
  where e.read_at is null on conflict do nothing;
  with pending as (
    select d.event_id,d.subscription_id from public.cc_push_deliveries d
    join public.cc_events e on e.id=d.event_id and e.read_at is null
    join public.push_topic_preferences p on p.subscription_id=d.subscription_id and p.topic='cuenta-clara' and p.enabled
    where d.sent_at is null and d.next_attempt_at<=now() and (d.locked_until is null or d.locked_until<now())
    order by e.created_at limit 25 for update of d skip locked
  ), claimed as (
    update public.cc_push_deliveries d set locked_until=now()+interval '2 minutes',lease_token=gen_random_uuid(),attempts=attempts+1
    from pending p where d.event_id=p.event_id and d.subscription_id=p.subscription_id returning d.*
  ) select coalesce(jsonb_agg(jsonb_build_object('event_id',c.event_id,'subscription_id',c.subscription_id,'lease_token',c.lease_token,
    'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth)), '[]'::jsonb) into result
  from claimed c join public.order_push_subscriptions s on s.id=c.subscription_id;
  return result;
end;
$$;
revoke all on function public.claim_cc_push() from public,anon,authenticated;
grant execute on function public.claim_cc_push() to service_role;

create function public.complete_cc_push(p_event_id uuid,p_subscription_id uuid,p_lease_token uuid,p_success boolean,p_expired boolean default false) returns void
language plpgsql security invoker set search_path='' as $$
begin
  update public.cc_push_deliveries set sent_at=case when p_success then now() end,locked_until=null,
    next_attempt_at=now()+make_interval(secs=>least(3600,60*power(2,least(attempts,6))::integer))
  where event_id=p_event_id and subscription_id=p_subscription_id and lease_token=p_lease_token;
  if found and p_expired then delete from public.order_push_subscriptions where id=p_subscription_id; end if;
end;
$$;
revoke all on function public.complete_cc_push(uuid,uuid,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.complete_cc_push(uuid,uuid,uuid,boolean,boolean) to service_role;

create function private.dispatch_cc_push() returns bigint language plpgsql security definer set search_path='' as $$
declare config jsonb;
begin
  if not exists(select 1 from public.cc_events e join public.order_push_subscriptions s on s.user_id=e.user_id
    join public.push_topic_preferences p on p.subscription_id=s.id and p.topic='cuenta-clara' and p.enabled and e.created_at>=p.enabled_since
    left join public.cc_push_deliveries d on d.event_id=e.id and d.subscription_id=s.id
    where e.read_at is null and d.sent_at is null and (d.next_attempt_at is null or d.next_attempt_at<=now())
      and (d.locked_until is null or d.locked_until<now())) then return null; end if;
  select decrypted_secret::jsonb into config from vault.decrypted_secrets where name='order_push_config';
  if config is null then return null; end if;
  return net.http_post(url:=regexp_replace(config->>'function_url','/send-order-reminders$','/send-cuenta-clara'),
    headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',config->>'cron_secret'),
    body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=60000);
end;
$$;
revoke all on function private.dispatch_cc_push() from public,anon,authenticated;
select cron.schedule('cuenta-clara-web-push','* * * * *','select private.dispatch_cc_push();');

-- Restrict order reminder delivery and reconciliation to the orders topic.
create or replace function public.claim_order_push_deliveries() returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  insert into public.order_push_deliveries (reminder_id, subscription_id, scheduled_for)
  select r.id, s.id, r.remind_at
  from public.friend_order_reminders r
  join private.order_push_enabled_subscriptions s on s.user_id = r.user_id
  where not r.notified and r.remind_at <= now()
  on conflict do nothing;

  -- Reconcile accepted deliveries after concurrent workers finish their transactions.
  update public.friend_order_reminders r set notified = true
  where not r.notified and r.remind_at <= now()
    and exists (select 1 from private.order_push_enabled_subscriptions s where s.user_id = r.user_id)
    and not exists (
      select 1 from private.order_push_enabled_subscriptions s
      left join public.order_push_deliveries d on d.subscription_id = s.id
        and d.reminder_id = r.id and d.scheduled_for = r.remind_at
      where s.user_id = r.user_id and d.sent_at is null
    );

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
  from claimed c join private.order_push_enabled_subscriptions s on s.id = c.subscription_id
  join public.friend_order_reminders r on r.id = c.reminder_id
  left join public.friend_contacts f on f.id = r.friend_id and f.user_id = r.user_id;
  return result;
end;
$$;


create or replace function public.complete_order_push_delivery(
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
    and exists (select 1 from private.order_push_enabled_subscriptions s where s.user_id = r.user_id)
    and not exists (
      select 1 from private.order_push_enabled_subscriptions s
      left join public.order_push_deliveries d on d.subscription_id = s.id
        and d.reminder_id = r.id and d.scheduled_for = r.remind_at
      where s.user_id = r.user_id and d.sent_at is null
    );
end;
$$;

create or replace function private.dispatch_order_reminders() returns bigint
language plpgsql security definer set search_path = '' as $$
declare config jsonb;
begin
  if not exists (
    select 1 from public.friend_order_reminders r
    join private.order_push_enabled_subscriptions s on s.user_id = r.user_id
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
