import { supabase } from '@/lib/supabase';

export type MovementStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export interface Movement {
  id: string; kind: 'debt' | 'payment' | 'reversal'; amount: string; direction: number;
  concept: string; occurred_on: string; author_id: string; author_name: string;
  status: MovementStatus; proof_path: string | null; reverses_id: string | null; is_voided: boolean;
  created_at: string; decided_at: string | null; decided_by: string | null;
  decided_name: string | null; decision_reason: string | null;
}
export interface VoidRequest {
  id: string; movement_id: string; author_id: string; author_name: string; reason: string;
  status: MovementStatus; created_at: string; decided_at: string | null;
  decided_by: string | null; decided_name: string | null; decision_reason: string | null;
}
export interface CuentaState {
  access: 'member' | 'restricted'; role?: 'owner' | 'debtor'; account_id?: string; balance?: string;
  members?: { id: string; username: string; role: 'owner' | 'debtor' }[];
  movements?: Movement[]; void_requests?: VoidRequest[];
  join_requests?: { id: string; username: string; created_at: string }[];
  join_request?: { status: 'pending' | 'approved' | 'rejected' | 'expired'; created_at: string } | null;
  invitation?: { id: string; expires_at: string } | null;
  events?: { id: string; kind: string; target_id: string | null; created_at: string; read_at: string | null }[];
}

export const pesos = (value: string | bigint) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(typeof value === 'string' ? BigInt(value) : value);

export const localDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

export const dateLabel = (value: string) => new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota', dateStyle: 'medium', ...(value.includes('T') ? { timeStyle: 'short' as const } : {}),
}).format(new Date(value.includes('T') ? value : `${value}T12:00:00Z`));

export async function cuentaAction(action: string, payload: Record<string, unknown> = {}) {
  if (!navigator.onLine) throw new Error('Sin conexión. Vuelve a conectarte antes de guardar movimientos.');
  const { data, error } = await supabase.rpc('cc_action', { p_action: action, p_payload: payload });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; token?: string; expires_at?: string };
}

export async function uploadProof(file: File, accountId: string, userId: string, movementId: string) {
  const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const ext = extensions[file.type];
  if (!ext || file.size > 5 * 1024 * 1024) throw new Error('Usa una imagen JPEG, PNG o WebP de máximo 5 MB.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const signature = ext === 'jpg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : ext === 'png' ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71
    : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!signature) throw new Error('El archivo no parece ser una imagen válida.');
  const path = `${accountId}/${userId}/${movementId}.${ext}`;
  const { error } = await supabase.storage.from('cc-proofs').upload(path, file, { contentType: file.type, upsert: false });
  if (error && !/already exists|duplicate/i.test(error.message)) throw new Error('No se pudo subir el comprobante. Inténtalo otra vez.');
  return path;
}

export const eventLabels: Record<string, string> = {
  join_requested: 'Una persona solicitó unirse. Verifica su usuario.', join_approved: 'Se aprobó tu acceso.', join_rejected: 'No se aprobó tu acceso.',
  movement_requested: 'Hay un movimiento pendiente de tu confirmación.', payment_recorded: 'Se registró un abono recibido.',
  movement_approved: 'Se aprobó tu movimiento.', movement_rejected: 'Se rechazó tu movimiento.', movement_cancelled: 'Se canceló una solicitud.',
  void_requested: 'Hay una solicitud de anulación.', void_approved: 'Se aprobó una anulación.', void_rejected: 'Se rechazó una anulación.', void_cancelled: 'Se canceló una solicitud de anulación.',
};
