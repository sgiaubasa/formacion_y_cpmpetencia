import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Envío de correos de eficacia deshabilitado temporalmente a pedido del usuario.
  return NextResponse.json({
    success: true,
    paused: true,
    message: 'El envío de correos de evaluación de eficacia se encuentra deshabilitado temporalmente.',
    notificationsSent: []
  });
}
