begin;
do $$
declare uid uuid; device uuid:=gen_random_uuid(); event uuid; claimed jsonb; item jsonb; pref jsonb;
begin
  select owner_id into uid from public.cc_accounts;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  insert into public.order_push_subscriptions(id,user_id,endpoint,p256dh,auth)
    values(device,uid,'https://fcm.googleapis.com/fcm/send/cc-queue-test-'||device,repeat('A',87),repeat('B',22));
  perform public.set_push_topic(device,'orders',true);
  perform public.set_push_topic(device,'cuenta-clara',true);
  perform public.set_push_topic(device,'orders',false);
  if not exists(select 1 from public.push_topic_preferences where subscription_id=device and topic='cuenta-clara' and enabled)
    then raise exception 'Disabling Orders disabled Cuenta Clara'; end if;
  perform public.set_push_topic(device,'orders',true);
  perform public.set_push_topic(device,'cuenta-clara',false);
  if not exists(select 1 from public.push_topic_preferences where subscription_id=device and topic='orders' and enabled)
    then raise exception 'Disabling Cuenta Clara disabled Orders'; end if;
  if has_function_privilege('authenticated','public.claim_cc_push()','execute') or has_function_privilege('anon','public.claim_cc_push()','execute')
    then raise exception 'Push queue exposed to client'; end if;
  perform public.set_push_topic(device,'cuenta-clara',true);
  insert into public.cc_events(account_id,user_id,kind) select id,uid,'test' from public.cc_accounts returning id into event;
  claimed:=public.claim_cc_push();
  select value into item from jsonb_array_elements(claimed) where value->>'subscription_id'=device::text and value->>'event_id'=event::text;
  if item is null then raise exception 'Enabled Cuenta Clara event not claimed'; end if;
  if item ? 'amount' or item ? 'concept' or item ? 'note' then raise exception 'Push claim contains financial content'; end if;
  claimed:=public.claim_cc_push();
  if exists(select 1 from jsonb_array_elements(claimed) where value->>'subscription_id'=device::text and value->>'event_id'=event::text)
    then raise exception 'Push delivery claimed twice'; end if;
  perform public.complete_cc_push(event,device,(item->>'lease_token')::uuid,false,false);
  if not exists(select 1 from public.cc_push_deliveries where event_id=event and subscription_id=device and sent_at is null and next_attempt_at>now())
    then raise exception 'Failure did not schedule retry'; end if;
  update public.cc_push_deliveries set next_attempt_at=now()-interval '1 second' where event_id=event and subscription_id=device;
  claimed:=public.claim_cc_push();
  select value into item from jsonb_array_elements(claimed) where value->>'subscription_id'=device::text and value->>'event_id'=event::text;
  perform public.complete_cc_push(event,device,(item->>'lease_token')::uuid,true,false);
  if not exists(select 1 from public.cc_push_deliveries where event_id=event and subscription_id=device and sent_at is not null)
    then raise exception 'Success not recorded'; end if;
  claimed:=public.claim_cc_push();
  if exists(select 1 from jsonb_array_elements(claimed) where value->>'subscription_id'=device::text and value->>'event_id'=event::text)
    then raise exception 'Successful notification repeated'; end if;
  perform public.set_push_topic(device,'cuenta-clara',false);
  insert into public.cc_events(account_id,user_id,kind) select id,uid,'test_disabled' from public.cc_accounts returning id into event;
  claimed:=public.claim_cc_push();
  if exists(select 1 from jsonb_array_elements(claimed) where value->>'subscription_id'=device::text and value->>'event_id'=event::text)
    then raise exception 'Disabled topic still sends'; end if;
end;
$$;
rollback;
select 'PASS: independent topics, private queue ACL, lease, retry, deduplication and no financial push data' as result;
