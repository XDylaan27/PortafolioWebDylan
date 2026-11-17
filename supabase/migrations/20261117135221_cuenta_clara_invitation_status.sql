create or replace function private.cc_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); result jsonb; member_role text;
begin
  if uid is null then raise exception 'Inicia sesión para continuar.'; end if;
  select role into member_role from public.cc_members where user_id=uid;
  if member_role is null then
    return jsonb_build_object('access','restricted','join_request',(
      select jsonb_build_object('status',case when j.status='pending' and (i.revoked_at is not null or i.expires_at<=now()) then 'expired' else j.status end,'created_at',j.created_at) from public.cc_join_requests j join public.cc_invitations i on i.id=j.invitation_id where j.user_id=uid order by j.created_at desc limit 1
    ));
  end if;
  select jsonb_build_object(
    'access','member','role',member_role,'account_id',a.id,
    'balance',coalesce((select sum(m.amount::numeric*m.direction)::text from public.cc_movements m where m.status='approved'),'0'),
    'members',(select coalesce(jsonb_agg(jsonb_build_object('id',c.user_id,'role',c.role,'username',coalesce(p.username,'Usuario'))),'[]'::jsonb) from public.cc_members c left join public.profiles p on p.id=c.user_id),
    'movements',(select coalesce(jsonb_agg(to_jsonb(m) || jsonb_build_object('amount',m.amount::text,'is_voided',exists(select 1 from public.cc_movements r where r.reverses_id=m.id)) order by m.created_at desc),'[]'::jsonb) from public.cc_movements m),
    'void_requests',(select coalesce(jsonb_agg(to_jsonb(v) order by v.created_at desc),'[]'::jsonb) from public.cc_void_requests v),
    'join_requests',case when member_role='owner' then (select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'username',j.username,'created_at',j.created_at) order by j.created_at),'[]'::jsonb) from public.cc_join_requests j join public.cc_invitations i on i.id=j.invitation_id where j.status='pending' and i.revoked_at is null and i.expires_at>now()) else '[]'::jsonb end,
    'invitation',case when member_role='owner' then (select jsonb_build_object('id',i.id,'expires_at',i.expires_at) from public.cc_invitations i where i.revoked_at is null and i.expires_at>now() order by i.created_at desc limit 1) else null end,
    'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc),'[]'::jsonb) from (select * from public.cc_events where user_id=uid order by created_at desc limit 30)e)
  ) into result from public.cc_accounts a;
  return result;
end;
$$;
