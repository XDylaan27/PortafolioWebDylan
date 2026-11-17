'use client';

import { useEffect, useRef, useState } from 'react';
import { FileImage, Loader2, X } from 'lucide-react';
import { cuentaAction, localDate, pesos, uploadProof } from '@/lib/cuenta-clara';
import { supabase } from '@/lib/supabase';

export default function MovementForm({ kind, owner, accountId, userId, onClose, onSaved }: {
  kind: 'debt' | 'payment'; owner: boolean; accountId: string; userId: string; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const requestId = useRef<string | null>(null);
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(localDate);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  const direct = owner && kind === 'payment';
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-950 p-6 text-neutral-100 backdrop:bg-black/80">
    <div className="flex items-center justify-between"><h2 className="text-xl font-medium">{kind === 'debt' ? 'Proponer una deuda' : direct ? 'Registrar abono recibido' : 'Solicitar un abono'}</h2><button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar formulario" className="p-2"><X className="h-5 w-5" /></button></div>
    <p className="mt-3 text-sm leading-relaxed text-neutral-400">{direct ? 'Confirma aquí solamente el dinero que ya recibiste. El saldo cambiará al guardarlo.' : 'El saldo cambiará cuando la otra persona acepte este movimiento.'}</p>
    <form className="mt-6 space-y-5" onSubmit={async (event) => {
      event.preventDefault(); if (busy) return; setBusy(true); setError('');
      let proof: string | null = null;
      try {
        requestId.current ??= crypto.randomUUID();
        if (file) proof = await uploadProof(file, accountId, userId, requestId.current);
        await cuentaAction('propose', { id: requestId.current, kind, amount, concept: concept.trim(), occurred_on: date, proof_path: proof });
        await onSaved(); onClose();
      } catch (e) {
        if (proof) await supabase.storage.from('cc-proofs').remove([proof]);
        setError(e instanceof Error ? e.message : 'No se pudo guardar.'); setBusy(false);
      }
    }}>
      <label className="block text-sm text-neutral-300">Monto en pesos colombianos<input required inputMode="numeric" maxLength={15} value={amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} onChange={(event) => { const raw = event.target.value; if (!/^[\d.]*$/.test(raw)) { setError('Usa pesos enteros positivos, sin comas ni centavos.'); return; } setError(''); setAmount(raw.replace(/\D/g, '').slice(0, 12)); }} placeholder="50.000" className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-2xl outline-none focus:border-emerald-500" /><span className="mt-1 block text-xs text-neutral-500">{amount ? pesos(amount) : 'Sin centavos. Los abonos pueden generar saldo a favor.'}</span></label>
      <label className="block text-sm text-neutral-300">Concepto<input required maxLength={240} value={concept} onChange={(event) => setConcept(event.target.value)} placeholder={kind === 'debt' ? 'Por ejemplo: préstamo del domingo' : 'Por ejemplo: transferencia recibida'} className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 outline-none focus:border-emerald-500" /></label>
      <label className="block text-sm text-neutral-300">Fecha del movimiento<input required type="date" max={localDate()} value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 outline-none focus:border-emerald-500 [color-scheme:dark]" /></label>
      <label className="block rounded-xl border border-dashed border-neutral-700 p-4 text-sm text-neutral-300"><span className="mb-2 flex items-center gap-2"><FileImage className="h-4 w-4" />Comprobante opcional</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="w-full text-xs file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:p-2 file:text-neutral-200" /><span className="mt-2 block text-xs text-neutral-500">JPEG, PNG o WebP · máximo 5 MB · visible solo para ambos.</span></label>
      {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
      <button type="submit" disabled={busy || !amount || BigInt(amount || '0') <= BigInt(0) || !concept.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-300 p-3 font-semibold text-neutral-950 disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{direct ? 'Confirmar dinero recibido' : 'Enviar para confirmación'}</button>
    </form>
  </dialog>;
}
