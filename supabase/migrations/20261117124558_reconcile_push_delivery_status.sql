create or replace function public.claim_order_push_deliveries() returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  insert into public.order_push_deliveries (reminder_id, subscription_id, scheduled_for)
  select r.id, s.id, r.remind_at
  from public.friend_order_reminders r
  join public.order_push_subscriptions s on s.user_id = r.user_id
  where not r.notified and r.remind_at <= now()
  on conflict do nothing;

  -- Reconcile accepted deliveries after concurrent workers finish their transactions.
  update public.friend_order_reminders r set notified = true
  where not r.notified and r.remind_at <= now()
    and exists (select 1 from public.order_push_subscriptions s where s.user_id = r.user_id)
    and not exists (
      select 1 from public.order_push_subscriptions s
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
  from claimed c join public.order_push_subscriptions s on s.id = c.subscription_id
  join public.friend_order_reminders r on r.id = c.reminder_id
  left join public.friend_contacts f on f.id = r.friend_id and f.user_id = r.user_id;
  return result;
end;
$$;
