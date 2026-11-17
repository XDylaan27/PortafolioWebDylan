-- Run as postgres in the SQL editor. All fixture data is rolled back; no HTTP is sent.
begin;
do $$
declare
  test_user uuid;
  reminder uuid := gen_random_uuid();
  device uuid := gen_random_uuid();
  scheduled timestamptz := now() - interval '1 minute';
  claim jsonb;
  second_claim jsonb;
  item jsonb;
  notified boolean;
begin
  select id into test_user from auth.users order by created_at limit 1;
  if test_user is null then raise exception 'Test requires an existing auth user'; end if;
  insert into public.order_push_subscriptions(id,user_id,endpoint,p256dh,auth)
    values(device,test_user,'https://fcm.googleapis.com/fcm/send/queue-test-' || device,repeat('A',87),repeat('B',22));
  insert into public.push_topic_preferences(subscription_id,topic) values(device,'orders');
  insert into public.friend_order_reminders(id,user_id,remind_at,note)
    values(reminder,test_user,scheduled,'Transactional queue verification');

  claim := public.claim_order_push_deliveries();
  select value into item from jsonb_array_elements(claim) where value->>'subscription_id' = device::text;
  if item is null then raise exception 'Due delivery was not claimed'; end if;
  second_claim := public.claim_order_push_deliveries();
  if exists(select 1 from jsonb_array_elements(second_claim) where value->>'subscription_id' = device::text)
    then raise exception 'Delivery was claimed twice while leased'; end if;

  perform public.complete_order_push_delivery(reminder,device,scheduled,(item->>'lease_token')::uuid,false,false);
  select r.notified into notified from public.friend_order_reminders r where id = reminder;
  if notified then raise exception 'A failed delivery was marked sent'; end if;
  if not exists(select 1 from public.order_push_deliveries where reminder_id = reminder and next_attempt_at > now())
    then raise exception 'Retry did not receive backoff'; end if;
  update public.order_push_deliveries set next_attempt_at = now() - interval '1 second' where reminder_id = reminder;
  claim := public.claim_order_push_deliveries();
  select value into item from jsonb_array_elements(claim) where value->>'subscription_id' = device::text;
  if item is null then raise exception 'Retry was not claimed'; end if;
  perform public.complete_order_push_delivery(reminder,device,scheduled,(item->>'lease_token')::uuid,true,false);
  -- Other real devices may belong to this user: only this fixture's delivery is asserted here.
  if not exists(select 1 from public.order_push_deliveries where reminder_id = reminder and subscription_id = device and sent_at is not null)
    then raise exception 'Accepted delivery was not recorded'; end if;

  update public.friend_order_reminders set notified = false, note = 'Rescheduled fixture' where id = reminder;
  if exists(select 1 from public.order_push_deliveries where reminder_id = reminder)
    then raise exception 'Editing did not invalidate prior deliveries'; end if;
  claim := public.claim_order_push_deliveries();
  select value into item from jsonb_array_elements(claim) where value->>'subscription_id' = device::text;
  perform public.complete_order_push_delivery(reminder,device,scheduled,(item->>'lease_token')::uuid,false,true);
  if exists(select 1 from public.order_push_subscriptions where id = device)
    then raise exception 'Expired endpoint was not removed'; end if;

  delete from public.friend_order_reminders where id = reminder;
  if exists(select 1 from public.order_push_deliveries where reminder_id = reminder)
    then raise exception 'Cancellation did not remove deliveries'; end if;
end;
$$;

-- ACLs and RLS: ordinary users cannot read private configuration or send the queue.
do $$
begin
  if has_function_privilege('anon','public.get_order_push_config()','execute')
    or has_function_privilege('authenticated','public.get_order_push_config()','execute')
    or has_function_privilege('authenticated','public.claim_order_push_deliveries()','execute')
    then raise exception 'Private RPC exposed to a client role'; end if;
  if has_table_privilege('anon','public.order_push_subscriptions','select')
    or has_table_privilege('authenticated','public.order_push_deliveries','select')
    then raise exception 'Private table exposed'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
set local role authenticated;
do $$
begin
  if exists(select 1 from public.order_push_subscriptions)
    then raise exception 'RLS exposed another user subscriptions'; end if;
  if public.get_order_push_public_key() is null
    then raise exception 'Authenticated user cannot obtain the public VAPID key'; end if;
end;
$$;
reset role;
rollback;
select 'PASS: claim, lease, retry, backoff, success, edit, expiry, cancellation, ACL and RLS' as result;
