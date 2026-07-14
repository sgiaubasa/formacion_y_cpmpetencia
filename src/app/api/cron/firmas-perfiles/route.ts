import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 min

export async function GET(req: Request) {
  try {
    // 1. Check Auth Header to secure the cron route
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn("Intento de acceso no autorizado al cron de firmas");
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Buscar perfiles activos que les falte alguna firma
    const perfilesIncompletos = await prisma.jobProfile.findMany({
      where: {
        isActive: true,
        OR: [
          { firmaRRHH: null },
          { firmaGerenteArea: null },
          { firmaGerenteGeneral: null }
        ]
      }
    });

    if (perfilesIncompletos.length === 0) {
      return NextResponse.json({ success: true, message: "Todos los perfiles activos están firmados." });
    }

    // Obtener a los administradores del sistema para avisarles del resumen
    const admins = await prisma.appUser.findMany({
      where: { role: { in: ['SGI', 'RRHH'] } }
    });
    
    const adminEmails = admins.map(a => a.email);
    
    if (adminEmails.length > 0) {
      let html = `<h2>Atención: Perfiles Vigentes Pendientes de Firma</h2>`;
      html += `<p>El sistema detectó ${perfilesIncompletos.length} perfiles que están activos pero no tienen todas las firmas requeridas completas.</p>`;
      html += `<ul>`;
      
      perfilesIncompletos.forEach(p => {
        let faltan = [];
        if (!p.firmaRRHH) faltan.push("RRHH");
        if (!p.firmaGerenteArea) faltan.push("Gerente de Área");
        if (!p.firmaGerenteGeneral) faltan.push("Gerente General");
        
        html += `<li><strong>${p.title}</strong> (Rev: ${p.revision}): Faltan firmas de ${faltan.join(', ')}</li>`;
      });
      
      html += `</ul>`;
      html += `<p>Por favor, ingrese al sistema para completar las firmas o presionar a los responsables.</p>`;
      
      await sendMail({
        to: adminEmails.join(','),
        subject: "SGCySV - Alerta de Perfiles sin Firmar",
        html: html
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Correos enviados notificando sobre ${perfilesIncompletos.length} perfiles incompletos.` 
    });

  } catch (error: any) {
    console.error("Error en cron de firmas:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
