import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Esta ruta actúa como heartbeat/ping para mantener despierto Supabase
export async function GET(request: Request) {
  try {
    const start = Date.now();
    
    // Consulta ligera al esquema público para mantener activa la base de datos
    const { data, error } = await supabase
      .from('bet_rooms')
      .select('id')
      .limit(1);

    const latency = Date.now() - start;

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
          latencyMs: latency,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase ping exitoso (Keep-Alive activo)',
      timestamp: new Date().toISOString(),
      latencyMs: latency,
      count: data?.length ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Error desconocido ejecutando ping',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
