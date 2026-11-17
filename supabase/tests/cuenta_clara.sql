-- Before onboarding: transactional fixtures, no real loans, uploads or messages.
begin;
do $$
declare debtor uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); owner_id uuid; expired_token text:=encode(extensions.gen_random_bytes(32),'hex');
begin
  select a.owner_id into owner_id from public.cc_accounts a;
  if exists(select 1 from public.cc_members where role='debtor') then raise exception 'Run this onboarding suite before linking the real debtor.'; end if;
  insert into auth.users(id,email,raw_user_meta_data) values
    (debtor,'cc-test-'||debtor||'@example.invalid',jsonb_build_object('username','cc_test_debtor_'||left(debtor::text,8))),
    (stranger,'cc-test-'||stranger||'@example.invalid',jsonb_build_object('username','cc_test_stranger_'||left(stranger::text,8)));
  perform set_config('cc.test_owner',owner_id::text,true);
  perform set_config('cc.test_debtor',debtor::text,true);
  perform set_config('cc.test_stranger',stranger::text,true);
  perform set_config('cc.test_expired_token',expired_token,true);
  insert into public.cc_invitations(account_id,token_hash,expires_at) select id,encode(extensions.digest(expired_token,'sha256'),'hex'),now()-interval '1 day' from public.cc_accounts;
end;
$$;
set local role authenticated;
do $$
declare
  own uuid:=current_setting('cc.test_owner')::uuid; debtor uuid:=current_setting('cc.test_debtor')::uuid; stranger uuid:=current_setting('cc.test_stranger')::uuid;
  token text; request_id uuid; debt uuid:=gen_random_uuid(); payment uuid:=gen_random_uuid(); direct_payment uuid:=gen_random_uuid();
  rejected uuid:=gen_random_uuid(); cancelled uuid:=gen_random_uuid(); void_id uuid:=gen_random_uuid(); second_void uuid:=gen_random_uuid();
  payload jsonb; result jsonb; baseline numeric; denied boolean; proof_id uuid:=gen_random_uuid(); proof text;
begin
  perform set_config('request.jwt.claim.sub',own::text,true);
  baseline:=(public.cc_state()->>'balance')::numeric;
  token:=public.cc_action('invite_create')->>'token';
  if length(token)<>64 then raise exception 'Invite token not generated'; end if;
  -- Revocation and expiry both block admission.
  perform set_config('request.jwt.claim.sub',stranger::text,true);
  perform public.cc_action('join',jsonb_build_object('token',token));
  perform set_config('request.jwt.claim.sub',own::text,true);
  perform public.cc_action('invite_revoke');
  perform set_config('request.jwt.claim.sub',stranger::text,true);
  if public.cc_state()->'join_request'->>'status'<>'expired' then raise exception 'Revoked pending invitation still shown as pending'; end if;
  denied:=false;
  begin perform public.cc_action('join',jsonb_build_object('token',current_setting('cc.test_expired_token'))); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Expired invite accepted'; end if;
  denied:=false;
  begin perform public.cc_action('join',jsonb_build_object('token',token)); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Revoked invite accepted'; end if;
  perform set_config('request.jwt.claim.sub',own::text,true);
  token:=public.cc_action('invite_create')->>'token';
  perform set_config('request.jwt.claim.sub',debtor::text,true);
  perform public.cc_action('join',jsonb_build_object('token',token));
  if public.cc_state()->>'access'<>'restricted' then raise exception 'Invite granted immediate access'; end if;
  perform set_config('request.jwt.claim.sub',own::text,true);
  request_id:=(public.cc_state()->'join_requests'->0->>'id')::uuid;
  perform public.cc_action('join_decide',jsonb_build_object('id',request_id,'accept',true));

  payload:=jsonb_build_object('id',debt,'kind','debt','amount','50000','concept','SQL test loan','occurred_on',current_date);
  perform public.cc_action('propose',payload);
  perform public.cc_action('propose',payload);
  if (public.cc_state()->>'balance')::numeric<>baseline then raise exception 'Pending loan changed balance'; end if;
  denied:=false;
  begin perform public.cc_action('decide',jsonb_build_object('id',debt,'accept',true)); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Owner approved own loan'; end if;
  perform set_config('request.jwt.claim.sub',debtor::text,true);
  perform public.cc_action('decide',jsonb_build_object('id',debt,'accept',true));
  perform public.cc_action('decide',jsonb_build_object('id',debt,'accept',true));
  if (public.cc_state()->>'balance')::numeric<>baseline+50000 then raise exception 'Loan approval duplicated'; end if;

  payload:=jsonb_build_object('id',payment,'kind','payment','amount','20000','concept','SQL test payment','occurred_on',current_date);
  perform public.cc_action('propose',payload);
  if (public.cc_state()->>'balance')::numeric<>baseline+50000 then raise exception 'Pending payment changed balance'; end if;
  denied:=false;
  begin perform public.cc_action('decide',jsonb_build_object('id',payment,'accept',true)); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Debtor approved own payment'; end if;
  perform set_config('request.jwt.claim.sub',own::text,true);
  perform public.cc_action('decide',jsonb_build_object('id',payment,'accept',true));
  perform public.cc_action('decide',jsonb_build_object('id',payment,'accept',true));
  if (public.cc_state()->>'balance')::numeric<>baseline+30000 then raise exception 'Expected balance after 20k payment is 30k'; end if;

  perform public.cc_action('propose',jsonb_build_object('id',direct_payment,'kind','payment','amount','40000','concept','SQL test direct payment','occurred_on',current_date));
  if (public.cc_state()->>'balance')::numeric<>baseline-10000 then raise exception 'Credit balance was not preserved'; end if;
  perform public.cc_action('void_request',jsonb_build_object('id',void_id,'movement_id',direct_payment,'reason','SQL correction'));
  if (public.cc_state()->>'balance')::numeric<>baseline-10000 then raise exception 'Pending void changed balance'; end if;
  denied:=false;
  begin perform public.cc_action('void_decide',jsonb_build_object('id',void_id,'accept',true)); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Void author approved own correction'; end if;
  perform set_config('request.jwt.claim.sub',debtor::text,true);
  perform public.cc_action('void_decide',jsonb_build_object('id',void_id,'accept',true));
  perform public.cc_action('void_decide',jsonb_build_object('id',void_id,'accept',true));
  if (public.cc_state()->>'balance')::numeric<>baseline+30000 then raise exception 'Compensation duplicated or missing'; end if;
  if not exists(select 1 from public.cc_movements where id=direct_payment and status='approved') then raise exception 'Original history was changed'; end if;

  perform public.cc_action('void_request',jsonb_build_object('id',second_void,'movement_id',debt,'reason','SQL disputed correction'));
  perform public.cc_action('propose',jsonb_build_object('id',rejected,'kind','payment','amount','1000','concept','SQL test rejected payment','occurred_on',current_date));
  perform public.cc_action('propose',jsonb_build_object('id',cancelled,'kind','payment','amount','1000','concept','SQL test cancelled payment','occurred_on',current_date));
  perform public.cc_action('cancel',jsonb_build_object('id',cancelled));
  perform set_config('request.jwt.claim.sub',own::text,true);
  denied:=false;
  begin perform public.cc_action('decide',jsonb_build_object('id',rejected,'accept',false)); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Rejection without reason allowed'; end if;
  perform public.cc_action('decide',jsonb_build_object('id',rejected,'accept',false,'reason','No money received'));
  perform public.cc_action('void_decide',jsonb_build_object('id',second_void,'accept',false,'reason','Original loan is correct'));
  if (public.cc_state()->>'balance')::numeric<>baseline+30000 then raise exception 'Rejection/cancellation changed balance'; end if;
  denied:=false;
  begin update public.cc_movements set amount=1 where id=debt; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Client could rewrite ledger history'; end if;

  perform set_config('request.jwt.claim.sub',stranger::text,true);
  result:=public.cc_state();
  if result->>'access'<>'restricted' or result ? 'balance' then raise exception 'Stranger saw balance'; end if;
  if exists(select 1 from public.cc_movements) or exists(select 1 from public.cc_members) or exists(select 1 from public.cc_invitations) or exists(select 1 from public.cc_void_requests) then raise exception 'RLS exposed private rows'; end if;
  denied:=false;
  begin perform public.cc_action('propose',jsonb_build_object('id',gen_random_uuid(),'kind','payment','amount','1','concept','bad','occurred_on',current_date)); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Stranger could mutate ledger'; end if;
  denied:=false;
  begin perform public.cc_action('join',jsonb_build_object('token',token)); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Used invite admitted a third user'; end if;
  perform set_config('request.jwt.claim.sub',own::text,true);
  denied:=false;
  begin perform public.cc_action('propose',jsonb_build_object('id',gen_random_uuid(),'kind','debt','amount','0','concept','Invalid zero','occurred_on',current_date)); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Zero amount accepted'; end if;
  denied:=false;
  begin perform public.cc_action('propose',jsonb_build_object('id',gen_random_uuid(),'kind','debt','amount','1.5','concept','Invalid fractional','occurred_on',current_date)); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Fractional pesos accepted'; end if;
  proof:=(public.cc_state()->>'account_id')||'/'||own||'/'||proof_id||'.png';
  -- Metadata-only fixture to verify Storage RLS; transaction rollback removes it.
  insert into storage.objects(bucket_id,name,metadata) values('cc-proofs',proof,'{"size":100,"mimetype":"image/png"}'::jsonb);
  perform public.cc_action('propose',jsonb_build_object('id',proof_id,'kind','debt','amount','1','concept','Private proof fixture','occurred_on',current_date,'proof_path',proof));
  begin
    delete from storage.objects where bucket_id='cc-proofs' and name=proof;
  exception when insufficient_privilege then null; -- Storage also rejects direct SQL deletion.
  end;
  if not exists(select 1 from storage.objects where bucket_id='cc-proofs' and name=proof) then raise exception 'Attached proof could be deleted'; end if;
  perform set_config('request.jwt.claim.sub',debtor::text,true);
  if not exists(select 1 from storage.objects where bucket_id='cc-proofs' and name=proof) then raise exception 'Other participant cannot read proof'; end if;
  perform set_config('request.jwt.claim.sub',stranger::text,true);
  if exists(select 1 from storage.objects where bucket_id='cc-proofs' and name=proof) then raise exception 'Stranger can read proof'; end if;
end;
$$;
reset role;
rollback;
select 'PASS: admission, revocation, mutual approvals, idempotency, 50k/20k/40k credit, compensations, rejections, cancellation, RLS and immutable history' as result;
