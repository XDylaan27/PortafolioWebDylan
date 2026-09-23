export interface BetRoom {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  creator_name: string;
  password_hash: string;
  status: 'open' | 'finished';
  final_score: number | null;
  created_at: string;
}

export interface BetParticipant {
  id: string;
  room_id: string;
  name: string;
  predicted_score: number | null; // Nullable when hidden before reveal
  created_at: string;
}

export interface RankedParticipant extends BetParticipant {
  difference: number;
  rank: number;
  isWinner: boolean;
}

/**
 * Genera un código de sala alfanumérico limpio y fácil de compartir (ej: 6 caracteres)
 */
export function generateRoomCode(length: number = 6): string {
  // Evitamos caracteres confusos como 0, O, 1, I, L
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Hash seguro SHA-256 para la contraseña del creador
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Calcula la clasificación por cercanía al puntaje oficial final
 */
export function calculateRankings(
  participants: BetParticipant[],
  finalScore: number
): RankedParticipant[] {
  // Filtramos solo los que tienen puntaje
  const withDiff = participants
    .filter((p) => p.predicted_score !== null && p.predicted_score !== undefined)
    .map((p) => {
      const score = Number(p.predicted_score);
      const diff = Math.abs(score - finalScore);
      return {
        ...p,
        difference: Number(diff.toFixed(2)),
      };
    });

  // Ordenamos de menor a mayor diferencia
  withDiff.sort((a, b) => a.difference - b.difference);

  if (withDiff.length === 0) return [];

  const minDiff = withDiff[0].difference;

  // Asignamos rangos con soporte para empates
  let currentRank = 1;
  return withDiff.map((p, index) => {
    if (index > 0 && p.difference > withDiff[index - 1].difference) {
      currentRank = index + 1;
    }
    return {
      ...p,
      rank: currentRank,
      isWinner: p.difference === minDiff,
    };
  });
}
