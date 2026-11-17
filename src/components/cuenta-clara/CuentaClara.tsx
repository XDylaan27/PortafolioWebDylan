'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Bell, Check, CheckCircle2, Clock3, Copy, Link2, Loader2, LockKeyhole, Plus, Receipt, RefreshCw, ShieldCheck, Undo2, Users, X } from 'lucide-react';
import AuthWidget from '@/components/AuthWidget';
import PushControls from '@/components/PushControls';
import { cuentaAction, dateLabel, eventLabels, pesos, type Movement, type VoidRequest } from '@/lib/cuenta-clara';
import { useCuentaClara } from './useCuentaClara';
import ActionDialog from './ActionDialog';
import MovementForm from './MovementForm';
import ProofButton from './ProofButton';

type Decision = { title: string; detail: string; label: string; needsReason?: boolean; action: string; payload: Record<string, unknown> };
const statusLabels = { pending: 'Por confirmar', approved: 'Confirmado', rejected: 'Rechazado', cancelled: 'Cancelado' };
const panel = 'rounded-2xl border border-neutral-800 bg-neutral-900/40';
const secondary = 'inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2.5 text-sm text-neutral-200 transition hover:border-neutral-500 disabled:opacity-40';

export default function CuentaClara() {
  const { user, state, error, connection, refresh } = useCuentaClara();
  const [token, setToken] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [form, setForm] = useState<'debt' | 'payment' | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'approved' | 'rejected' | 'cancelled'>('all');

  useEffect(() => {
    const incoming = new URLSearchParams(window.location.hash.slice(1)).get('invite');
    if (incoming && /^[a-f0-9]{64}$/.test(incoming)) {
      sessionStorage.setItem('cc_invite', incoming);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setToken(incoming);
    } else setToken(sessionStorage.getItem('cc_invite') || '');
  }, []);

  const run = async (action: string, payload: Record<string, unknown> = {}) => {
    setBusy(true); setActionError(''); setNotice('');
    try { const result = await cuentaAction(action, payload); await refresh(); return result; }
    finally { setBusy(false); }
  };
  const quick = async (action: string, payload: Record<string, unknown> = {}, message = 'Cambios guardados.') => {
    try { await run(action, payload); setNotice(message); }
    catch (e) { setActionError(e instanceof Error ? e.message : 'No se pudo completar la acción.'); }
  };

  const owner = state?.role === 'owner';
  const ready = state?.members?.length === 2;
  const movements = state?.movements ?? [];
  const pending = movements.filter((movement) => movement.status === 'pending');
  const voids = state?.void_requests ?? [];
  const pendingVoids = voids.filter((request) => request.status === 'pending');
  const balance = BigInt(state?.balance ?? '0');
  const unread = state?.events?.filter((event) => !event.read_at).length ?? 0;
  const partner = state?.members?.find((member) => member.id !== user?.id);

  const decideMovement = (movement: Movement, accept: boolean) => setDecision({
    title: accept ? 'Confirmar movimiento' : 'Rechazar movimiento',
    detail: `${movement.concept} · ${pesos(movement.amount)}. ${accept ? 'Al confirmar, el saldo compartido se actualizará.' : 'El saldo se mantendrá igual y ambos verán el motivo.'}`,
    label: accept ? 'Confirmar' : 'Rechazar', needsReason: !accept, action: 'decide', payload: { id: movement.id, accept },
  });
  const decideVoid = (request: VoidRequest, accept: boolean) => {
    const original = movements.find((movement) => movement.id === request.movement_id);
    setDecision({ title: accept ? 'Aceptar anulación' : 'Rechazar anulación',
      detail: `${original?.concept ?? 'Movimiento'} · ${original ? pesos(original.amount) : ''}. ${accept ? 'Se añadirá una compensación que invierte el efecto original; el historial se conservará.' : 'El movimiento original seguirá vigente.'}`,
      label: accept ? 'Anular movimiento' : 'Rechazar', needsReason: !accept, action: 'void_decide', payload: { id: request.id, accept },
    });
  };

  const movementCard = (movement: Movement) => {
    const mine = movement.author_id === user?.id;
    const canDecide = movement.status === 'pending' && !mine;
    const hasVoid = pendingVoids.some((request) => request.movement_id === movement.id);
    return <article id={`movement-${movement.id}`} key={movement.id} className={`${panel} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider"><span className="text-neutral-400">{movement.kind === 'debt' ? 'Deuda' : movement.kind === 'payment' ? 'Abono' : 'Compensación'}</span><span className={`rounded-full px-2 py-1 ${movement.status === 'approved' ? 'bg-emerald-400/10 text-emerald-300' : movement.status === 'rejected' ? 'bg-rose-400/10 text-rose-300' : 'bg-neutral-800 text-neutral-400'}`}>{movement.is_voided ? 'Anulado' : statusLabels[movement.status]}</span></div><h3 className="break-words text-base font-medium text-neutral-100">{movement.concept}</h3></div>
        <span className={`shrink-0 font-mono text-base sm:text-lg ${movement.status !== 'approved' ? 'text-neutral-300' : movement.direction > 0 ? 'text-amber-200' : 'text-emerald-300'}`}>{movement.direction > 0 ? '+' : '−'}{pesos(movement.amount)}</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-neutral-500">{dateLabel(movement.occurred_on)} · Registrado por {movement.author_name} · {dateLabel(movement.created_at)}</p>
      {movement.decided_name && <p className="mt-1 text-xs text-neutral-500">{movement.status === 'cancelled' ? 'Cancelado' : movement.status === 'rejected' ? 'Rechazado' : 'Confirmado'} por {movement.decided_name}{movement.decided_at ? ` · ${dateLabel(movement.decided_at)}` : ''}</p>}
      {movement.decision_reason && <p className="mt-3 rounded-lg bg-neutral-950/70 p-3 text-sm text-neutral-400">Motivo: {movement.decision_reason}</p>}
      {movement.proof_path && <div className="mt-3"><ProofButton path={movement.proof_path} /></div>}
      <div className="mt-4 flex flex-wrap gap-2">
        {canDecide && <><button type="button" disabled={busy} className={`${secondary} border-emerald-500/30 text-emerald-300`} onClick={() => decideMovement(movement, true)}><Check className="h-4 w-4" />Aceptar</button><button type="button" disabled={busy} className={secondary} onClick={() => decideMovement(movement, false)}><X className="h-4 w-4" />Rechazar</button></>}
        {movement.status === 'pending' && mine && <><span className="flex items-center gap-2 text-xs text-neutral-500"><Clock3 className="h-4 w-4" />Esperando a {partner?.username ?? 'la otra persona'}</span><button type="button" disabled={busy} className={secondary} onClick={() => setDecision({ title: 'Cancelar solicitud', detail: 'Esta solicitud quedará cancelada sin modificar el saldo. Para corregirla, podrás registrar otra.', label: 'Cancelar solicitud', action: 'cancel', payload: { id: movement.id } })}><X className="h-4 w-4" />Cancelar</button></>}
        {movement.status === 'approved' && !movement.is_voided && movement.kind !== 'reversal' && !hasVoid && <button type="button" disabled={busy} className="inline-flex items-center gap-2 py-1 text-xs text-neutral-500 hover:text-neutral-200" onClick={() => setDecision({ title: 'Solicitar anulación', detail: `${movement.concept} · ${pesos(movement.amount)}. La otra persona deberá aceptar. El movimiento se conservará en el historial.`, label: 'Enviar solicitud', needsReason: true, action: 'void_request', payload: { id: crypto.randomUUID(), movement_id: movement.id } })}><Undo2 className="h-3.5 w-3.5" />Solicitar anulación</button>}
        {hasVoid && <span className="text-xs text-amber-300">Anulación por confirmar</span>}
      </div>
    </article>;
  };

  return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
    <header className="mb-8 flex items-start justify-between gap-4"><div><div className="mb-3 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-emerald-300"><LockKeyhole className="h-3.5 w-3.5" />Espacio privado</div><h1 className="font-serif-editorial text-4xl tracking-tight sm:text-5xl">Cuenta Clara<span className="text-emerald-300">.</span></h1><p className="mt-3 text-sm text-neutral-500">Cada movimiento, claro para ambos.</p></div>{user && <button type="button" aria-label="Actualizar cuenta" onClick={() => void refresh()} className="rounded-full border border-neutral-800 p-3 text-neutral-400 hover:text-white"><RefreshCw className="h-4 w-4" /></button>}</header>

    {user === undefined && <p role="status" className="flex items-center gap-2 py-10 text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" />Comprobando sesión...</p>}
    {user === null && <section className={`${panel} space-y-5 p-7`}><ShieldCheck className="h-8 w-8 text-emerald-300" /><h2 className="text-xl">Una cuenta que solo ven sus participantes</h2><p className="text-sm leading-relaxed text-neutral-400">Inicia sesión con tu cuenta del portafolio. Si recibiste una invitación, podrás solicitar acceso después de entrar.</p><AuthWidget /></section>}
    {(error || actionError) && <div role="alert" className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">{actionError || error}<button type="button" className="ml-3 underline" onClick={() => void refresh()}>Actualizar</button></div>}
    {notice && <p role="status" className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</p>}
    {user && !state && !error && <p role="status" className="flex items-center gap-2 py-10 text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" />Cargando cuenta...</p>}

    {user && state?.access === 'restricted' && <section className={`${panel} space-y-5 p-6`}><LockKeyhole className="h-7 w-7 text-neutral-400" /><h2 className="text-xl">Acceso por invitación</h2><p className="text-sm leading-relaxed text-neutral-400">{state.join_request?.status === 'pending' ? 'Tu solicitud está pendiente. Dylan debe comprobar tu usuario y aprobarte; el enlace por sí solo no da acceso a las cuentas.' : state.join_request?.status === 'expired' ? 'La invitación venció o fue revocada. Pide a Dylan un enlace nuevo.' : state.join_request?.status === 'rejected' ? 'Tu solicitud no fue aprobada. Pide a Dylan un nuevo enlace si fue un error.' : 'Esta cuenta está reservada para sus dos participantes. Necesitas una invitación de Dylan.'}</p>
      {token && <button type="button" disabled={busy} className={`${secondary} border-emerald-500/40 text-emerald-200`} onClick={async () => { try { await run('join', { token }); sessionStorage.removeItem('cc_invite'); setToken(''); setNotice('Solicitud enviada. Espera la confirmación de Dylan.'); } catch (e) { setActionError(e instanceof Error ? e.message : 'No se pudo solicitar el acceso.'); } }}><Users className="h-4 w-4" />Solicitar acceso con esta invitación</button>}
      {state.join_request && <PushControls userId={user.id} topic="cuenta-clara" />}
    </section>}

    {user && state?.access === 'member' && <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500"><span className="inline-flex items-center gap-2"><Users className="h-3.5 w-3.5" />{state.members?.map((member) => member.username).join(' / ')}{!ready && ' / por vincular'}</span><span className="inline-flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${connection === 'live' ? 'bg-emerald-300' : 'bg-amber-300'}`} />{connection === 'live' ? 'Sincronizado en vivo' : connection === 'offline' ? 'Conexión interrumpida · actualizando al reconectar' : 'Conectando...'}</span></div>
      <section className="relative overflow-hidden rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-emerald-950/60 via-neutral-900 to-neutral-950 p-6 sm:p-9"><div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-emerald-400/5 blur-3xl" /><div className="relative"><p className="text-xs font-mono uppercase tracking-[0.15em] text-neutral-400">Saldo confirmado · COP</p><p className="mt-4 break-all font-mono text-4xl font-medium tracking-tight text-emerald-200 sm:text-6xl">{pesos(balance < BigInt(0) ? -balance : balance)}</p><h2 className="mt-3 text-base text-neutral-200">{balance === BigInt(0) ? 'Cuenta saldada' : balance > BigInt(0) ? owner ? 'Tu primo te debe' : 'Saldo que debes' : owner ? 'Saldo a favor de tu primo' : 'Saldo a tu favor'}</h2><p className="mt-5 flex items-center gap-2 text-xs text-neutral-500"><ShieldCheck className="h-4 w-4" />Solo los movimientos confirmados cambian este saldo.</p></div></section>
      <div className="grid grid-cols-2 gap-3"><div className={`${panel} p-4`}><p className="text-xs text-neutral-500">Abonos por confirmar</p><p className="mt-2 font-mono text-lg text-neutral-200">{pesos(pending.filter((movement) => movement.kind === 'payment').reduce((sum, movement) => sum + BigInt(movement.amount), BigInt(0)))}</p></div><div className={`${panel} p-4`}><p className="text-xs text-neutral-500">Deudas por confirmar</p><p className="mt-2 font-mono text-lg text-neutral-200">{pesos(pending.filter((movement) => movement.kind === 'debt').reduce((sum, movement) => sum + BigInt(movement.amount), BigInt(0)))}</p></div></div>

      {owner && !ready && <section className={`${panel} space-y-4 p-5`}><h2 className="flex items-center gap-2 font-medium"><Users className="h-4 w-4 text-emerald-300" />Vincula a tu primo</h2><p className="text-sm text-neutral-400">Genera un enlace, compártelo con él y comprueba su username antes de aprobar su acceso. La cuenta empieza en cero.</p><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className={secondary} onClick={async () => { try { const result = await run('invite_create'); setInviteLink(`${window.location.origin}/lab/cuenta-clara#invite=${result.token}`); } catch (e) { setActionError(e instanceof Error ? e.message : 'No se pudo crear el enlace.'); } }}><Link2 className="h-4 w-4" />{state.invitation ? 'Generar otro enlace' : 'Crear invitación'}</button>{state.invitation && <button type="button" disabled={busy} className={secondary} onClick={async () => { try { await run('invite_revoke'); setInviteLink(''); setNotice('Invitación revocada.'); } catch (e) { setActionError(e instanceof Error ? e.message : 'No se pudo revocar.'); } }}><X className="h-4 w-4" />Revocar</button>}</div>{state.invitation && <p className="text-xs text-neutral-500">Vence el {dateLabel(state.invitation.expires_at)}. Crear otro enlace invalida el anterior.</p>}{inviteLink && state.invitation && <div className="space-y-2 rounded-lg border border-neutral-700 bg-neutral-950 p-3"><input aria-label="Enlace de invitación" readOnly value={inviteLink} className="w-full bg-transparent text-xs text-neutral-400 outline-none" /><button type="button" className={`${secondary} w-full`} onClick={async () => { try { await navigator.clipboard.writeText(inviteLink); setNotice('Enlace copiado. Compártelo solo con tu primo.'); } catch { setActionError('No se pudo copiar. Selecciona y copia el enlace manualmente.'); } }}><Copy className="h-4 w-4" />Copiar enlace</button></div>}
        {state.join_requests?.map((request) => <div key={request.id} className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-sm"><strong className="text-amber-200">{request.username}</strong> solicita acceso</p><p className="mt-2 text-xs text-neutral-500">{dateLabel(request.created_at)} · Comprueba que este es el usuario de tu primo.</p><div className="mt-3 flex gap-2"><button type="button" disabled={busy} className={secondary} onClick={() => setDecision({ title: 'Confirmar a tu primo', detail: `¿Reconoces a ${request.username}? Tendrá acceso al saldo, historial y comprobantes. Solo habrá dos participantes.`, label: 'Aprobar acceso', action: 'join_decide', payload: { id: request.id, accept: true } })}><Check className="h-4 w-4" />Aprobar</button><button type="button" disabled={busy} className={secondary} onClick={() => void quick('join_decide', { id: request.id, accept: false }, 'Acceso rechazado.')}><X className="h-4 w-4" />Rechazar</button></div></div>)}
      </section>}

      <div className="flex flex-wrap gap-3">{owner && <button type="button" disabled={!ready || busy} onClick={() => setForm('debt')} className={secondary}><ArrowUpRight className="h-4 w-4" />Proponer deuda</button>}<button type="button" disabled={!ready || busy} onClick={() => setForm('payment')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-5 py-3 text-sm font-semibold text-neutral-950 hover:bg-emerald-200 disabled:opacity-40 sm:flex-none"><Plus className="h-4 w-4" />{owner ? 'Registrar abono recibido' : 'Registrar mi abono'}</button></div>

      <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg"><Clock3 className="h-4 w-4 text-amber-200" />Por confirmar</h2><span className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-400">{pending.length + pendingVoids.length}</span></div>{pending.length === 0 && pendingVoids.length === 0 && <div className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-800 p-5 text-sm text-neutral-500"><CheckCircle2 className="h-5 w-5" />No hay solicitudes pendientes.</div>}{(['debt', 'payment'] as const).map((kind) => pending.some((movement) => movement.kind === kind) && <div key={kind} className="space-y-3"><h3 className="text-xs font-mono uppercase tracking-wider text-neutral-500">{kind === 'debt' ? 'Deudas' : 'Abonos'}</h3>{pending.filter((movement) => movement.kind === kind).map(movementCard)}</div>)}
        {pendingVoids.map((request) => <article key={request.id} className={`${panel} space-y-3 p-5`}><h3 className="flex items-center gap-2 font-medium"><Undo2 className="h-4 w-4 text-amber-200" />Anulación solicitada</h3><p className="text-sm text-neutral-300">{movements.find((movement) => movement.id === request.movement_id)?.concept}</p><p className="text-sm text-neutral-400">{request.reason}</p><p className="text-xs text-neutral-500">Por {request.author_name} · {dateLabel(request.created_at)}</p><div className="flex flex-wrap gap-2">{request.author_id !== user.id ? <><button type="button" disabled={busy} className={secondary} onClick={() => decideVoid(request, true)}><Check className="h-4 w-4" />Aceptar anulación</button><button type="button" disabled={busy} className={secondary} onClick={() => decideVoid(request, false)}><X className="h-4 w-4" />Rechazar</button></> : <button type="button" disabled={busy} className={secondary} onClick={() => setDecision({ title: 'Cancelar solicitud de anulación', detail: 'El movimiento original seguirá vigente.', label: 'Cancelar solicitud', action: 'void_cancel', payload: { id: request.id } })}><X className="h-4 w-4" />Cancelar solicitud</button>}</div></article>)}
      </section>

      <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg"><Receipt className="h-4 w-4 text-neutral-400" />Historial</h2><select aria-label="Filtrar historial" value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value as typeof historyFilter)} className="rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-xs text-neutral-300"><option value="all">Todos los estados</option><option value="approved">Confirmados</option><option value="rejected">Rechazados</option><option value="cancelled">Cancelados</option></select></div>{movements.filter((movement) => movement.status !== 'pending' && (historyFilter === 'all' || movement.status === historyFilter)).map(movementCard)}{!movements.some((movement) => movement.status !== 'pending' && (historyFilter === 'all' || movement.status === historyFilter)) && <p className="rounded-xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-500">Todavía no hay movimientos en este estado.</p>}
        {voids.filter((request) => request.status !== 'pending').length > 0 && <details className={`${panel} p-4`}><summary className="cursor-pointer text-sm text-neutral-400">Historial de solicitudes de anulación</summary><div className="mt-4 space-y-4">{voids.filter((request) => request.status !== 'pending').map((request) => <div key={request.id} className="border-t border-neutral-800 pt-3 text-sm text-neutral-400"><p>{movements.find((movement) => movement.id === request.movement_id)?.concept} · {statusLabels[request.status]}</p><p className="mt-1 text-xs text-neutral-500">{request.reason} · Solicitado por {request.author_name} · {dateLabel(request.created_at)}</p>{request.decided_name && <p className="mt-1 text-xs text-neutral-500">Decidido por {request.decided_name}{request.decided_at ? ` · ${dateLabel(request.decided_at)}` : ''}{request.decision_reason ? ` · ${request.decision_reason}` : ''}</p>}</div>)}</div></details>}
      </section>

      <details className={`${panel} p-5`}><summary className="cursor-pointer text-sm text-neutral-300">Avisos de la cuenta {unread > 0 && <span className="ml-2 rounded-full bg-emerald-300/10 px-2 py-1 text-xs text-emerald-300">{unread} sin leer</span>}</summary><div className="mt-5 space-y-3">{unread > 0 && <button type="button" className={secondary} disabled={busy} onClick={() => void quick('read_events', {}, 'Avisos marcados como leídos.')}><Check className="h-4 w-4" />Marcar como leídos</button>}{state.events?.map((event) => <p key={event.id} className={`border-t border-neutral-800 pt-3 text-sm ${event.read_at ? 'text-neutral-500' : 'text-neutral-300'}`}>{eventLabels[event.kind] ?? 'Tu cuenta tiene una actualización.'}<span className="mt-1 block text-xs text-neutral-600">{dateLabel(event.created_at)}</span></p>)}{!state.events?.length && <p className="text-sm text-neutral-500">Los cambios de la cuenta aparecerán aquí.</p>}</div></details>
      <section className="space-y-3"><h2 className="flex items-center gap-2 text-sm text-neutral-300"><Bell className="h-4 w-4" />Avisos en este dispositivo</h2><PushControls userId={user.id} topic="cuenta-clara" /></section>
      <p className="border-t border-neutral-800 pt-5 text-xs leading-relaxed text-neutral-600">Historial compartido en pesos colombianos, sin intereses automáticos. Los comprobantes son privados y no confirman un abono por sí solos.</p>
    </div>}

    {decision && <ActionDialog key={`${decision.action}-${String(decision.payload.id)}`} title={decision.title} detail={decision.detail} needsReason={decision.needsReason} confirmLabel={decision.label} onClose={() => setDecision(null)} onConfirm={async (reason) => { await run(decision.action, { ...decision.payload, reason }); setNotice('Decisión guardada y sincronizada.'); }} />}
    {form && user && state?.account_id && <MovementForm kind={form} owner={owner} accountId={state.account_id} userId={user.id} onClose={() => setForm(null)} onSaved={async () => { await refresh(); setNotice('Movimiento guardado. Ambos verán el mismo estado.'); }} />}
  </div>;
}
