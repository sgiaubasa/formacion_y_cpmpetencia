"use server";

import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function confirmarCambioPuestoAction(formData: FormData) {
  const empId = parseInt(formData.get("empId") as string);
  const targetProfileId = parseInt(formData.get("targetProfileId") as string);
  const gapsToCreate = formData.getAll("gap") as string[];
  const targetSectorId = parseInt(formData.get("targetSectorId") as string || "0");
  const notificationEmails = formData.get("notificationEmails") as string || "sergio.montes@aubasa.com.ar";

  // 1. Obtener datos para el correo
  const empleado = await prisma.employee.findUnique({
    where: { id: empId },
    include: { jobProfile: true }
  });
  const targetProfile = await prisma.jobProfile.findUnique({
    where: { id: targetProfileId }
  });
  
  const targetSector = await prisma.sector.findUnique({
    where: { id: targetSectorId }
  });

  if (!empleado || !targetProfile) throw new Error("Datos inválidos");

  // 2. Crear PendingTransfer
  const pending = await prisma.pendingTransfer.create({
    data: {
      employeeId: empId,
      targetProfileId: targetProfileId,
      targetSectorId: targetSectorId,
      gaps: JSON.stringify(gapsToCreate)
    }
  });

  // 3. Simular Email con Nodemailer Ethereal
  let previewUrl = "";
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const hasGaps = gapsToCreate.length > 0;
    
    const emailSubject = `Atención: Transferencia pendiente de aprobación para ${empleado.name}`;

    const emailBody = `Hola, RRHH ha propuesto a ${empleado.name} para el puesto de ${targetProfile.title} en su sector.
    
Para que este cambio se haga efectivo, usted DEBE ingresar al sistema (sección Transferencias) y CONFIRMAR la recepción.
Al momento de confirmar, será obligatorio que programe las fechas para las siguientes capacitaciones faltantes.
    
IMPORTANTE: Cuenta con un plazo de 90 días como máximo para programar y completar estas capacitaciones, de manera que se cumpla con la evaluación inicial obligatoria.
    
Detalles:
- Empleado: ${empleado.name} (Legajo: ${empleado.legajo})
- Nuevo Puesto: ${targetProfile.title}
- Capacitaciones a Planificar:
${gapsToCreate.map(g => "  • " + g).join("\n")}

Por favor, ingrese al sistema para confirmar el cambio.
`;

    const info = await transporter.sendMail({
      from: '"RRHH - SGC" <rrhh@aubasa.com.ar>',
      to: notificationEmails,
      subject: emailSubject,
      text: emailBody,
    });

    previewUrl = nodemailer.getTestMessageUrl(info) || "";
    console.log("Correo simulado enviado. URL:", previewUrl);
  } catch (error) {
    console.error("Error enviando email mock:", error);
  }

  return { success: true, previewUrl };
}
