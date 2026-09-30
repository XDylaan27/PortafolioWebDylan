import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword, calculateRankings, BetRoom, BetParticipant } from '@/lib/bets';

interface Params {
  params: Promise<{ code: string }>;
}

const VALID_CODE_REGEX = /^[A-Z0-9]{4,10}$/;

// GET: Obtener estado de la sala y participantes
export async function GET(request: Request, { params }: Params) {
  try {
    const { code } = await params;
    const roomCode = code?.trim().toUpperCase();

    if (!roomCode || !VALID_CODE_REGEX.test(roomCode)) {
      return NextResponse.json({ error: 'Código de sala inválido.' }, { status: 400 });
    }

    // 1. Obtener la sala
    const { data: room, error: roomError } = await supabase
      .from('bet_rooms')
      .select('id, code, title, description, creator_name, status, final_score, created_at')
      .eq('code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Sala de apuesta no encontrada.' }, { status: 404 });
    }

    // 2. Obtener participantes
    const { data: participants, error: partError } = await supabase
      .from('bet_participants')
      .select('id, room_id, name, predicted_score, created_at')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true });

    if (partError) {
      return NextResponse.json({ error: 'Error al cargar participantes.' }, { status: 500 });
    }

    const isFinished = room.status === 'finished';

    // 3. Si la apuesta sigue abierta, enmascaramos los puntajes para máxima privacidad
    const sanitizedParticipants: BetParticipant[] = (participants || []).map((p) => ({
      id: p.id,
      room_id: p.room_id,
      name: p.name,
      predicted_score: isFinished ? Number(p.predicted_score) : null,
      created_at: p.created_at,
    }));

    // 4. Si ya finalizó, calculamos rankings oficiales
    const rankings = isFinished && room.final_score !== null
      ? calculateRankings(sanitizedParticipants, Number(room.final_score))
      : [];

    return NextResponse.json({
      room,
      participants: sanitizedParticipants,
      rankings,
      totalParticipants: sanitizedParticipants.length,
    });
  } catch (error) {
    console.error('Error en GET /api/bets/[code]:', error);
    return NextResponse.json({ error: 'Error al consultar la sala.' }, { status: 500 });
  }
}

// POST: Registrar un participante y su predicción
export async function POST(request: Request, { params }: Params) {
  try {
    const { code } = await params;
    const roomCode = code?.trim().toUpperCase();

    if (!roomCode || !VALID_CODE_REGEX.test(roomCode)) {
      return NextResponse.json({ error: 'Código de sala inválido.' }, { status: 400 });
    }

    const body = await request.json();
    const { name, score } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    }

    const numericScore = Number(score);
    if (score === undefined || score === null || !Number.isFinite(numericScore) || Math.abs(numericScore) > 1e9) {
      return NextResponse.json({ error: 'Debes ingresar un puntaje numérico válido.' }, { status: 400 });
    }

    const trimmedName = name.trim().slice(0, 60);

    // 1. Verificar existencia y estado de la sala
    const { data: room, error: roomError } = await supabase
      .from('bet_rooms')
      .select('id, status')
      .eq('code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Sala no encontrada.' }, { status: 404 });
    }

    if (room.status !== 'open') {
      return NextResponse.json({ error: 'Esta apuesta ya ha finalizado. No se aceptan más predicciones.' }, { status: 400 });
    }

    // 2. Insertar participante (la restricción UNIQUE de postgres protege duplicados de nombre en la misma sala)
    const { data: newParticipant, error: insertError } = await supabase
      .from('bet_participants')
      .insert({
        room_id: room.id,
        name: trimmedName,
        predicted_score: numericScore,
      })
      .select('id, room_id, name, created_at')
      .single();

    if (insertError) {
      // Código PostgreSQL 23505 = unique_violation
      if (insertError.code === '23505' || insertError.message.includes('unique')) {
        return NextResponse.json(
          { error: `El nombre "${trimmedName}" ya fue registrado en esta apuesta. Cada persona puede participar solo una vez.` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Error al registrar tu predicción.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      participant: newParticipant,
    });
  } catch (error) {
    console.error('Error en POST /api/bets/[code]:', error);
    return NextResponse.json({ error: 'Error interno al unirse a la apuesta.' }, { status: 500 });
  }
}

// PATCH: Resolver la apuesta (Solo creador con contraseña verificada en PostgreSQL vía RPC seguro)
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { code } = await params;
    const roomCode = code?.trim().toUpperCase();

    if (!roomCode || !VALID_CODE_REGEX.test(roomCode)) {
      return NextResponse.json({ error: 'Código de sala inválido.' }, { status: 400 });
    }

    const body = await request.json();
    const { password, finalScore } = body;

    if (!password || typeof password !== 'string' || password.length > 128) {
      return NextResponse.json({ error: 'Ingresa la contraseña del creador.' }, { status: 400 });
    }

    const numericFinalScore = Number(finalScore);
    if (finalScore === undefined || finalScore === null || !Number.isFinite(numericFinalScore) || Math.abs(numericFinalScore) > 1e9) {
      return NextResponse.json({ error: 'Ingresa el resultado final oficial.' }, { status: 400 });
    }

    const providedHash = await hashPassword(password);

    const { data: rpcResult, error: rpcError } = await supabase.rpc('resolve_bet_room', {
      p_code: roomCode,
      p_password_hash: providedHash,
      p_final_score: numericFinalScore,
    });

    if (rpcError || !rpcResult) {
      return NextResponse.json({ error: 'No se pudo actualizar el resultado de la sala.' }, { status: 500 });
    }

    if (rpcResult.error === 'not_found') {
      return NextResponse.json({ error: 'Sala no encontrada.' }, { status: 404 });
    }

    if (rpcResult.error === 'unauthorized') {
      return NextResponse.json({ error: 'Contraseña incorrecta. Solo el creador puede finalizar la apuesta.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      room: rpcResult.room,
    });
  } catch (error) {
    console.error('Error en PATCH /api/bets/[code]:', error);
    return NextResponse.json({ error: 'Error interno al finalizar la apuesta.' }, { status: 500 });
  }
}
