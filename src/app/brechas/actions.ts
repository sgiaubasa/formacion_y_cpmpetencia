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
      gaps: JSON.stringify(gapsToCreate),
      sourceProfileId: empleado.jobProfileId,
      sourceSectorId: empleado.sectorId
    }
  });

  let previewUrl = "";
  try {
    const hasGaps = gapsToCreate.length > 0;
    
    const emailSubject = `Atención: Transferencia pendiente de aprobación para ${empleado.name}`;

    const emailBody = `
      <p>Hola, RRHH ha propuesto a <strong>${empleado.name}</strong> para el puesto de <strong>${targetProfile.title}</strong> en su sector.</p>
      <p>Para que este cambio se haga efectivo, usted <strong>DEBE ingresar al sistema (sección Transferencias) y CONFIRMAR la recepción</strong>.</p>
      <p>Al momento de confirmar, será obligatorio que programe las fechas para las siguientes capacitaciones faltantes.</p>
      <p style="color: red; font-weight: bold;">IMPORTANTE: Cuenta con un plazo de 90 días como máximo para programar y completar estas capacitaciones, de manera que se cumpla con la evaluación inicial obligatoria.</p>
      <h3>Detalles:</h3>
      <ul>
        <li><strong>Empleado:</strong> ${empleado.name} (Legajo: ${empleado.legajo})</li>
        <li><strong>Nuevo Puesto:</strong> ${targetProfile.title}</li>
      </ul>
      <h3>Capacitaciones a Planificar:</h3>
      <ul>
        ${gapsToCreate.map(g => `<li>${g}</li>`).join("")}
      </ul>
      <p>Por favor, ingrese al sistema para confirmar el cambio.</p>
    `;

    const { sendMail } = await import('@/lib/mailer');
    await sendMail({
      to: notificationEmails,
      subject: emailSubject,
      html: emailBody
    });

  } catch (error) {
    console.error("Error enviando email de transferencia:", error);
  }

  return { success: true, previewUrl };
}
