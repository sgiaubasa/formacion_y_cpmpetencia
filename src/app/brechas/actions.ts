"use server";

import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function confirmarCambioPuestoAction(formData: FormData) {
  const empId = parseInt(formData.get("empId") as string);
  const targetProfileId = parseInt(formData.get("targetProfileId") as string);
  const gapsToCreate = formData.getAll("gap") as string[];
  const targetSectorId = parseInt(formData.get("targetSectorId") as string || "0");
  const notificationEmails = formData.get("notificationEmails") as string || "sergio.montes@aubasa.com.ar";
  const senderEmail = formData.get("senderEmail") as string;

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
    let templateSetting = await prisma.appSetting.findUnique({
      where: { id: 'email_template_transferencia' }
    });

    const hasGaps = gapsToCreate.length > 0;
    
    const emailSubject = `Atención: Transferencia pendiente de aprobación para ${empleado.name}`;

    let emailBody = templateSetting?.value || "";
    // Reemplazar variables
    emailBody = emailBody.replace(/\{\{nombre\}\}/g, empleado.name);
    emailBody = emailBody.replace(/\{\{puesto\}\}/g, targetProfile.title);
    emailBody = emailBody.replace(/\{\{legajo\}\}/g, empleado.legajo);
    
    const brechasHtml = gapsToCreate.map(g => `<li>${g}</li>`).join("");
    emailBody = emailBody.replace(/\{\{brechas\}\}/g, brechasHtml);

    const { sendMail } = await import('@/lib/mailer');
    await sendMail({
      from: `"RRHH - SGC" <${senderEmail || 'rrhh@aubasa.com.ar'}>`,
      to: notificationEmails,
      subject: emailSubject,
      html: emailBody
    });

  } catch (error) {
    console.error("Error enviando email de transferencia:", error);
  }

  return { success: true, previewUrl };
}
