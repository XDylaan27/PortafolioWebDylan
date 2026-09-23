import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateRoomCode, hashPassword } from '@/lib/bets';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, creatorName, password } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'El nombre de la apuesta es obligatorio.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.trim().length < 3) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 3 caracteres.' },
        { status: 400 }
      );
    }

    const trimmedTitle = title.trim();
    const trimmedCreator = (creatorName && typeof creatorName === 'string' && creatorName.trim()) 
      ? creatorName.trim() 
      : 'Creador';

    const passwordHash = await hashPassword(password);

    // Intentamos generar un código único (hasta 5 intentos para evitar colisiones)
    let roomCode = '';
    let inserted = false;

    for (let i = 0; i < 5; i++) {
      const candidateCode = generateRoomCode(6);
      const { data, error } = await supabase
        .from('bet_rooms')
        .insert({
          code: candidateCode,
          title: trimmedTitle,
          description: description?.trim() || null,
          creator_name: trimmedCreator,
          password_hash: passwordHash,
          status: 'open',
        })
        .select()
        .single();

      if (!error && data) {
        roomCode = data.code;
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      return NextResponse.json(
        { error: 'No se pudo generar la sala. Por favor intenta de nuevo.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      code: roomCode,
    });
  } catch (error) {
    console.error('Error al crear sala:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado al crear la sala.' },
      { status: 500 }
    );
  }
}
