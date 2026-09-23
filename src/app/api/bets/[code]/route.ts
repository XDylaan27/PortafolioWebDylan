import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword, calculateRankings, BetRoom, BetParticipant } from '@/lib/bets';

interface Params {
  params: Promise<{ code: string }>;
}

// GET: Obtener estado de la sala y participantes
export async function GET(request: Request, { params }: Params) {
  try {
    const { code } = await params;
    const roomCode = code?.toUpperCase();

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
    const roomCode = code?.toUpperCase();
    const body = await request.json();
    const { name, score } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    }

    if (score === undefined || score === null || isNaN(Number(score))) {
      return NextResponse.json({ error: 'Debes ingresar un puntaje válido.' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const numericScore = Number(score);

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

// PATCH: Resolver la apuesta (Solo creador con contraseña)
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { code } = await params;
    const roomCode = code?.toUpperCase();
    const body = await request.json();
    const { password, finalScore } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Ingresa la contraseña del creador.' }, { status: 400 });
    }

    if (finalScore === undefined || finalScore === null || isNaN(Number(finalScore))) {
      return NextResponse.json({ error: 'Ingresa el resultado final oficial.' }, { status: 400 });
    }

    const numericFinalScore = Number(finalScore);

    // 1. Obtener la sala con su password_hash
    const { data: room, error: roomError } = await supabase
      .from('bet_rooms')
      .select('id, password_hash, status')
      .eq('code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Sala no encontrada.' }, { status: 404 });
    }

    // 2. Verificar contraseña
    const providedHash = await hashPassword(password);
    if (providedHash !== room.password_hash) {
      return NextResponse.json({ error: 'Contraseña incorrecta. Solo el creador puede finalizar la apuesta.' }, { status: 401 });
    }

    // 3. Actualizar la sala como finalizada con el resultado oficial
    const { data: updatedRoom, error: updateError } = await supabase
      .from('bet_rooms')
      .update({
        status: 'finished',
        final_score: numericFinalScore,
      })
      .eq('id', room.id)
      .select('id, code, title, status, final_score')
      .single();

    if (updateError || !updatedRoom) {
      return NextResponse.json({ error: 'No se pudo actualizar el resultado de la sala.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      room: updatedRoom,
    });
  } catch (error) {
    console.error('Error en PATCH /api/bets/[code]:', error);
    return NextResponse.json({ error: 'Error interno al finalizar la apuesta.' }, { status: 500 });
  }
}
