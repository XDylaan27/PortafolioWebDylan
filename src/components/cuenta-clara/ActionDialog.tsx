'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';

export default function ActionDialog({ title, detail, needsReason, confirmLabel, onConfirm, onClose }: {
  title: string; detail: string; needsReason?: boolean; confirmLabel: string;
  onConfirm: (reason: string) => Promise<void>; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-neutral-700 bg-neutral-950 p-6 text-neutral-100 shadow-2xl backdrop:bg-black/80">
    <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-medium">{title}</h2><button type="button" aria-label="Cerrar" disabled={busy} onClick={onClose} className="p-2"><X className="h-4 w-4" /></button></div>
    <p className="my-4 text-sm leading-relaxed text-neutral-400">{detail}</p>
    <form onSubmit={async (event) => {
      event.preventDefault(); if (busy) return; setBusy(true); setError('');
      try { await onConfirm(reason.trim()); onClose(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); setBusy(false); }
    }} className="space-y-4">
      {needsReason && <label className="block text-sm text-neutral-300">Motivo<textarea required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 outline-none focus:border-emerald-500" /></label>}
      {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
      <div className="flex gap-3"><button type="button" disabled={busy} onClick={onClose} className="flex-1 rounded-lg border border-neutral-700 p-3 text-sm">Volver</button><button disabled={busy} type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-300 p-3 text-sm font-semibold text-neutral-950 disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{confirmLabel}</button></div>
    </form>
  </dialog>;
}
