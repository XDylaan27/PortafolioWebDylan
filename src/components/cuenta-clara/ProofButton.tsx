'use client';

import { useEffect, useRef, useState } from 'react';
import { FileImage, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ProofButton({ path }: { path: string }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (url) dialog.current?.showModal(); }, [url]);
  return <>
    <button type="button" disabled={busy} onClick={async () => {
      setBusy(true); setError('');
      const { data, error: signError } = await supabase.storage.from('cc-proofs').createSignedUrl(path, 60);
      if (signError || !data) setError('No se pudo abrir el comprobante. Vuelve a intentarlo.'); else setUrl(data.signedUrl);
      setBusy(false);
    }} className="inline-flex items-center gap-2 text-xs text-neutral-300 underline decoration-neutral-700 underline-offset-4">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}Ver comprobante</button>
    {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
    {url && <dialog ref={dialog} onCancel={() => setUrl('')} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl rounded-xl border border-neutral-700 bg-neutral-950 p-4 text-neutral-100 backdrop:bg-black/85"><div className="mb-4 flex items-center justify-between"><h2>Comprobante privado</h2><button type="button" onClick={() => setUrl('')} aria-label="Cerrar comprobante" className="p-2"><X className="h-5 w-5" /></button></div><img src={url} alt="Comprobante del movimiento" className="max-h-[70dvh] w-full object-contain" /><p className="mt-3 text-xs text-neutral-500">El enlace temporal vence en un minuto. Puedes volver a abrirlo.</p></dialog>}
  </>;
}
