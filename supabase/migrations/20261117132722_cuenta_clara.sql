-- Cuenta Clara: a singleton private ledger. All writes pass through authenticated RPCs.
grant usage on schema private to authenticated, service_role;

create table public.cc_accounts (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check(singleton),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.cc_members (
  account_id uuid not null references public.cc_accounts(id),
  user_id uuid primary key references auth.users(id),
  role text not null check(role in ('owner','debtor')),
  joined_at timestamptz not null default now(),
  unique(account_id,role)
);
insert into public.cc_accounts(owner_id) values('b18873a7-7d97-4d3b-b287-a825e2c214df');
insert into public.cc_members(account_id,user_id,role) select id,owner_id,'owner' from public.cc_accounts;

create table public.cc_invitations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.cc_accounts(id),
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.cc_join_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.cc_accounts(id),
  invitation_id uuid not null references public.cc_invitations(id),
  user_id uuid not null references auth.users(id),
  username text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique(invitation_id,user_id)
);
create index cc_join_requests_user_idx on public.cc_join_requests(user_id);

create table public.cc_movements (
  id uuid primary key,
  account_id uuid not null references public.cc_accounts(id),
  kind text not null check(kind in ('debt','payment','reversal')),
  amount bigint not null check(amount between 1 and 999999999999),
  direction smallint not null check(direction in (-1,1)),
  concept text not null check(length(concept) between 1 and 240),
  occurred_on date not null,
  author_id uuid not null references auth.users(id),
  author_name text not null,
  status text not null check(status in ('pending','approved','rejected','cancelled')),
  proof_path text unique,
  reverses_id uuid unique references public.cc_movements(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  decided_name text,
  decision_reason text,
  check((kind='debt' and direction=1 and reverses_id is null) or (kind='payment' and direction=-1 and reverses_id is null) or (kind='reversal' and reverses_id is not null))
);
create index cc_movements_account_created_idx on public.cc_movements(account_id,created_at desc);
create table public.cc_void_requests (
  id uuid primary key,
  account_id uuid not null references public.cc_accounts(id),
  movement_id uuid not null references public.cc_movements(id),
  author_id uuid not null references auth.users(id),
  author_name text not null,
  reason text not null check(length(reason) between 1 and 500),
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  decided_name text,
  decision_reason text
);
create unique index cc_one_pending_void_idx on public.cc_void_requests(movement_id) where status='pending';
create index cc_void_requests_account_idx on public.cc_void_requests(account_id,created_at desc);
create table public.cc_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.cc_accounts(id),
  user_id uuid not null references auth.users(id),
  kind text not null,
  target_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index cc_events_recipient_idx on public.cc_events(user_id,created_at desc);

create function private.cc_member() returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and exists(select 1 from public.cc_members where user_id=(select auth.uid()));
$$;
create function private.cc_owner() returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and exists(select 1 from public.cc_members where user_id=(select auth.uid()) and role='owner');
$$;
revoke all on function private.cc_member(), private.cc_owner() from public, anon;
grant execute on function private.cc_member(), private.cc_owner() to authenticated;

alter table public.cc_accounts enable row level security;
alter table public.cc_members enable row level security;
alter table public.cc_invitations enable row level security;
alter table public.cc_join_requests enable row level security;
alter table public.cc_movements enable row level security;
alter table public.cc_void_requests enable row level security;
alter table public.cc_events enable row level security;
revoke all on public.cc_accounts, public.cc_members, public.cc_invitations, public.cc_join_requests, public.cc_movements, public.cc_void_requests, public.cc_events from anon, authenticated;
grant select on public.cc_accounts, public.cc_members, public.cc_invitations, public.cc_join_requests, public.cc_movements, public.cc_void_requests, public.cc_events to authenticated;
grant all on public.cc_accounts, public.cc_members, public.cc_invitations, public.cc_join_requests, public.cc_movements, public.cc_void_requests, public.cc_events to service_role;
create policy "CC members read account" on public.cc_accounts for select to authenticated using((select private.cc_member()));
create policy "CC members read participants" on public.cc_members for select to authenticated using((select private.cc_member()));
create policy "CC owner reads invitations" on public.cc_invitations for select to authenticated using((select private.cc_owner()));
create policy "CC own join requests" on public.cc_join_requests for select to authenticated using(user_id=(select auth.uid()) or (select private.cc_owner()));
create policy "CC members read movements" on public.cc_movements for select to authenticated using((select private.cc_member()));
create policy "CC members read void requests" on public.cc_void_requests for select to authenticated using((select private.cc_member()));
create policy "CC recipient reads events" on public.cc_events for select to authenticated using(user_id=(select auth.uid()));

create function private.cc_emit(p_user uuid,p_kind text,p_target uuid) returns void language sql security invoker set search_path='' as $$
  insert into public.cc_events(account_id,user_id,kind,target_id) select id,p_user,p_kind,p_target from public.cc_accounts where p_user is not null;
$$;
revoke all on function private.cc_emit(uuid,text,uuid) from public,anon,authenticated;

create function private.cc_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); result jsonb; member_role text;
begin
  if uid is null then raise exception 'Inicia sesión para continuar.'; end if;
  select role into member_role from public.cc_members where user_id=uid;
  if member_role is null then
    return jsonb_build_object('access','restricted','join_request',(
      select jsonb_build_object('status',j.status,'created_at',j.created_at) from public.cc_join_requests j where j.user_id=uid order by j.created_at desc limit 1
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
revoke all on function private.cc_state() from public,anon;
grant execute on function private.cc_state() to authenticated;
create function public.cc_state() returns jsonb language sql security invoker set search_path='' as $$ select private.cc_state(); $$;
revoke all on function public.cc_state() from public,anon;
grant execute on function public.cc_state() to authenticated;

create function private.cc_action(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid(); acct public.cc_accounts; member_role text; uname text; other_user uuid;
  inv public.cc_invitations; join_req public.cc_join_requests; mov public.cc_movements; vr public.cc_void_requests;
  target uuid; token text; reason text; amount_value bigint; concept_value text; date_value date; proof text; movement_kind text;
begin
  if uid is null then raise exception 'Inicia sesión para continuar.'; end if;
  -- Serializes all ledger decisions and invitation admissions for this two-person account.
  select * into acct from public.cc_accounts for update;
  select role into member_role from public.cc_members where user_id=uid;
  select coalesce(username,'Usuario') into uname from public.profiles where id=uid;
  uname:=coalesce(uname,'Usuario');
  select user_id into other_user from public.cc_members where user_id<>uid;

  if p_action='join' then
    if member_role is not null then return jsonb_build_object('ok',true); end if;
    token:=p_payload->>'token';
    if token is null or token !~ '^[a-f0-9]{64}$' then raise exception 'Invitación inválida o vencida.'; end if;
    select * into inv from public.cc_invitations where token_hash=encode(extensions.digest(token,'sha256'),'hex') and revoked_at is null and expires_at>now();
    if inv.id is null or exists(select 1 from public.cc_members where role='debtor') then raise exception 'Invitación inválida o vencida.'; end if;
    insert into public.cc_join_requests(account_id,invitation_id,user_id,username) values(acct.id,inv.id,uid,uname) on conflict(invitation_id,user_id) do nothing returning * into join_req;
    if join_req.id is not null then perform private.cc_emit(acct.owner_id,'join_requested',join_req.id); end if;
    return jsonb_build_object('ok',true);
  end if;
  if p_action='read_events' then
    update public.cc_events set read_at=now() where user_id=uid and read_at is null;
    return jsonb_build_object('ok',true);
  end if;
  if member_role is null then raise exception 'No tienes acceso a esta cuenta.'; end if;
  reason:=nullif(btrim(p_payload->>'reason'),'');
  if length(reason)>500 then raise exception 'El motivo no puede superar 500 caracteres.'; end if;

  if p_action='invite_create' then
    if member_role<>'owner' then raise exception 'Solo el propietario puede invitar.'; end if;
    if exists(select 1 from public.cc_members where role='debtor') then raise exception 'Tu primo ya está vinculado.'; end if;
    update public.cc_invitations set revoked_at=now() where revoked_at is null;
    token:=encode(extensions.gen_random_bytes(32),'hex');
    insert into public.cc_invitations(account_id,token_hash) values(acct.id,encode(extensions.digest(token,'sha256'),'hex')) returning * into inv;
    return jsonb_build_object('ok',true,'token',token,'expires_at',inv.expires_at);
  elsif p_action='invite_revoke' then
    if member_role<>'owner' then raise exception 'Solo el propietario puede revocar invitaciones.'; end if;
    update public.cc_invitations set revoked_at=now() where revoked_at is null;
    return jsonb_build_object('ok',true);
  elsif p_action='join_decide' then
    if member_role<>'owner' then raise exception 'Solo el propietario puede aprobar el acceso.'; end if;
    select * into join_req from public.cc_join_requests where id=(p_payload->>'id')::uuid for update;
    if join_req.id is null or join_req.status<>'pending' then raise exception 'Esta solicitud ya fue resuelta.'; end if;
    select * into inv from public.cc_invitations where id=join_req.invitation_id;
    if inv.revoked_at is not null or inv.expires_at<=now() then raise exception 'Esta invitación ya no es válida.'; end if;
    if coalesce((p_payload->>'accept')::boolean,false) then
      if exists(select 1 from public.cc_members where role='debtor') then raise exception 'La cuenta ya tiene dos participantes.'; end if;
      insert into public.cc_members(account_id,user_id,role) values(acct.id,join_req.user_id,'debtor');
      update public.cc_join_requests set status='approved',decided_at=now() where id=join_req.id;
      update public.cc_join_requests set status='rejected',decided_at=now() where status='pending' and id<>join_req.id;
      update public.cc_invitations set revoked_at=now() where revoked_at is null;
      perform private.cc_emit(join_req.user_id,'join_approved',join_req.id);
    else
      update public.cc_join_requests set status='rejected',decided_at=now() where id=join_req.id;
      perform private.cc_emit(join_req.user_id,'join_rejected',join_req.id);
    end if;
    return jsonb_build_object('ok',true);
  end if;

  target:=(p_payload->>'id')::uuid;
  if target is null then raise exception 'Identificador de movimiento obligatorio.'; end if;
  if p_action='propose' then
    if other_user is null then raise exception 'Vincula primero a tu primo.'; end if;
    movement_kind:=p_payload->>'kind';
    if movement_kind is null or movement_kind not in ('debt','payment') or (movement_kind='debt' and member_role<>'owner') then raise exception 'No puedes registrar este tipo de movimiento.'; end if;
    if coalesce(p_payload->>'amount','') !~ '^[0-9]{1,12}$' then raise exception 'Ingresa un monto en pesos enteros.'; end if;
    amount_value:=(p_payload->>'amount')::bigint;
    if amount_value<1 then raise exception 'El monto debe ser mayor que cero.'; end if;
    concept_value:=btrim(p_payload->>'concept'); date_value:=(p_payload->>'occurred_on')::date;
    if concept_value is null or length(concept_value) not between 1 and 240 then raise exception 'Escribe un concepto de hasta 240 caracteres.'; end if;
    if date_value is null or date_value>timezone('America/Bogota',now())::date or date_value<'1900-01-01' then raise exception 'La fecha debe ser válida y no estar en el futuro.'; end if;
    proof:=nullif(p_payload->>'proof_path','');
    select * into mov from public.cc_movements where id=target;
    if mov.id is not null then
      if mov.author_id=uid and mov.kind=movement_kind and mov.amount=amount_value and mov.concept=concept_value and mov.occurred_on=date_value and mov.proof_path is not distinct from proof then return jsonb_build_object('ok',true,'id',target); end if;
      raise exception 'Este identificador ya fue utilizado.';
    end if;
    if proof is not null and (
      proof !~ ('^'||acct.id::text||'/'||uid::text||'/'||target::text||'[.](jpg|jpeg|png|webp)$')
      or not exists(select 1 from storage.objects where bucket_id='cc-proofs' and name=proof)
    ) then raise exception 'El comprobante no pertenece a este movimiento.'; end if;
    insert into public.cc_movements(id,account_id,kind,amount,direction,concept,occurred_on,author_id,author_name,status,proof_path,decided_at,decided_by,decided_name)
    values(target,acct.id,movement_kind,amount_value,case when movement_kind='debt' then 1 else -1 end,concept_value,date_value,uid,uname,
      case when movement_kind='payment' and member_role='owner' then 'approved' else 'pending' end,proof,
      case when movement_kind='payment' and member_role='owner' then now() end,
      case when movement_kind='payment' and member_role='owner' then uid end,
      case when movement_kind='payment' and member_role='owner' then uname end);
    perform private.cc_emit(other_user,case when movement_kind='payment' and member_role='owner' then 'payment_recorded' else 'movement_requested' end,target);
    return jsonb_build_object('ok',true,'id',target);
  elsif p_action in ('decide','cancel') then
    select * into mov from public.cc_movements where id=target for update;
    if mov.id is null or mov.kind='reversal' then raise exception 'Movimiento no disponible.'; end if;
    if p_action='cancel' then
      if mov.author_id<>uid or mov.status<>'pending' then raise exception 'Solo puedes cancelar tus solicitudes pendientes.'; end if;
      update public.cc_movements set status='cancelled',decided_at=now(),decided_by=uid,decided_name=uname where id=target;
      perform private.cc_emit(other_user,'movement_cancelled',target);
    else
      if mov.author_id=uid or (mov.kind='payment' and member_role<>'owner') or (mov.kind='debt' and member_role<>'debtor') then raise exception 'No puedes decidir esta solicitud.'; end if;
      if mov.status<>'pending' then
        if mov.decided_by=uid and mov.status=(case when coalesce((p_payload->>'accept')::boolean,false) then 'approved' else 'rejected' end) then return jsonb_build_object('ok',true); end if;
        raise exception 'Esta solicitud ya fue resuelta.';
      end if;
      if not coalesce((p_payload->>'accept')::boolean,false) and reason is null then raise exception 'Escribe el motivo del rechazo.'; end if;
      update public.cc_movements set status=case when coalesce((p_payload->>'accept')::boolean,false) then 'approved' else 'rejected' end,
        decided_at=now(),decided_by=uid,decided_name=uname,decision_reason=reason where id=target;
      perform private.cc_emit(mov.author_id,case when coalesce((p_payload->>'accept')::boolean,false) then 'movement_approved' else 'movement_rejected' end,target);
    end if;
    return jsonb_build_object('ok',true);
  elsif p_action='void_request' then
    if reason is null then raise exception 'Explica por qué solicitas la anulación.'; end if;
    select * into mov from public.cc_movements where id=(p_payload->>'movement_id')::uuid;
    if mov.id is null or mov.status<>'approved' or mov.kind='reversal' or exists(select 1 from public.cc_movements where reverses_id=mov.id) then raise exception 'Este movimiento no se puede anular.'; end if;
    if exists(select 1 from public.cc_void_requests where id=target and author_id=uid) then return jsonb_build_object('ok',true); end if;
    if exists(select 1 from public.cc_void_requests where movement_id=mov.id and status='pending') then raise exception 'Ya existe una solicitud de anulación pendiente.'; end if;
    insert into public.cc_void_requests(id,account_id,movement_id,author_id,author_name,reason) values(target,acct.id,mov.id,uid,uname,reason);
    perform private.cc_emit(other_user,'void_requested',target);
    return jsonb_build_object('ok',true);
  elsif p_action in ('void_decide','void_cancel') then
    select * into vr from public.cc_void_requests where id=target for update;
    if vr.id is null then raise exception 'Anulación no disponible.'; end if;
    if p_action='void_cancel' then
      if vr.author_id<>uid or vr.status<>'pending' then raise exception 'Solo puedes cancelar tus solicitudes pendientes.'; end if;
      update public.cc_void_requests set status='cancelled',decided_at=now(),decided_by=uid,decided_name=uname where id=target;
      perform private.cc_emit(other_user,'void_cancelled',target);
    else
      if vr.author_id=uid then raise exception 'La otra persona debe confirmar la anulación.'; end if;
      if vr.status<>'pending' then
        if vr.decided_by=uid and vr.status=(case when coalesce((p_payload->>'accept')::boolean,false) then 'approved' else 'rejected' end) then return jsonb_build_object('ok',true); end if;
        raise exception 'Esta anulación ya fue resuelta.';
      end if;
      if not coalesce((p_payload->>'accept')::boolean,false) and reason is null then raise exception 'Escribe el motivo del rechazo.'; end if;
      select * into mov from public.cc_movements where id=vr.movement_id for update;
      if coalesce((p_payload->>'accept')::boolean,false) then
        insert into public.cc_movements(id,account_id,kind,amount,direction,concept,occurred_on,author_id,author_name,status,reverses_id,decided_at,decided_by,decided_name,decision_reason)
        values(vr.id,acct.id,'reversal',mov.amount,-mov.direction,'Anulación: '||left(mov.concept,229),timezone('America/Bogota',now())::date,vr.author_id,vr.author_name,'approved',mov.id,now(),uid,uname,vr.reason);
      end if;
      update public.cc_void_requests set status=case when coalesce((p_payload->>'accept')::boolean,false) then 'approved' else 'rejected' end,
        decided_at=now(),decided_by=uid,decided_name=uname,decision_reason=reason where id=target;
      perform private.cc_emit(vr.author_id,case when coalesce((p_payload->>'accept')::boolean,false) then 'void_approved' else 'void_rejected' end,target);
    end if;
    return jsonb_build_object('ok',true);
  end if;
  raise exception 'Acción no disponible.';
end;
$$;
revoke all on function private.cc_action(text,jsonb) from public,anon;
grant execute on function private.cc_action(text,jsonb) to authenticated;
create function public.cc_action(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.cc_action(p_action,p_payload); $$;
revoke all on function public.cc_action(text,jsonb) from public,anon;
grant execute on function public.cc_action(text,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cc-proofs','cc-proofs',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy "CC upload own proof" on storage.objects for insert to authenticated with check(
  bucket_id='cc-proofs' and (select private.cc_member()) and (storage.foldername(name))[1]=(select id::text from public.cc_accounts)
  and (storage.foldername(name))[2]=(select auth.uid())::text
);
create policy "CC read private proof" on storage.objects for select to authenticated using(
  bucket_id='cc-proofs' and (select private.cc_member()) and (storage.foldername(name))[1]=(select id::text from public.cc_accounts)
  and ((storage.foldername(name))[2]=(select auth.uid())::text or exists(select 1 from public.cc_movements where proof_path=name))
);
create policy "CC remove unattached own proof" on storage.objects for delete to authenticated using(
  bucket_id='cc-proofs' and (select private.cc_member()) and (storage.foldername(name))[2]=(select auth.uid())::text
  and not exists(select 1 from public.cc_movements where proof_path=name)
);

alter publication supabase_realtime add table public.cc_accounts,public.cc_members,public.cc_join_requests,public.cc_movements,public.cc_void_requests,public.cc_events;
