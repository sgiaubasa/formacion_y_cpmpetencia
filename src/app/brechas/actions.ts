"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function confirmarCambioPuestoAction(formData: FormData) {
  const empId = parseInt(formData.get("empId") as string);
  const targetProfileId = parseInt(formData.get("targetProfileId") as string);
  const gapsToCreate = formData.getAll("gap") as string[];
  const targetSectorId = parseInt((formData.get("targetSectorId") as string) || "0");
  const rawNotificationEmails = ((formData.get("notificationEmails") as string) || "").trim();
  const senderEmail = ((formData.get("senderEmail") as string) || "").trim();

  // 1. Obtener datos para el correo
  const empleado = await prisma.employee.findUnique({
    where: { id: empId },
    include: { jobProfile: true },
  });
  const targetProfile = await prisma.jobProfile.findUnique({
    where: { id: targetProfileId },
  });
  const targetSector = await prisma.sector.findUnique({
    where: { id: targetSectorId },
  });

  if (!empleado || !targetProfile) throw new Error("Datos inválidos");

  // Resolver todos los destinatarios: manuales + sector destino
  const manualEmails = rawNotificationEmails
    .split(/[,;\s]+/)
    .map(e => e.trim())
    .filter(e => e.includes("@"));

  let sectorEmails: string[] = [];
  if (targetSectorId) {
    const sectorUsers = await prisma.appUser.findMany({
      where: { sectorId: targetSectorId },
    });
    sectorEmails = [
      ...(targetSector?.mail ? targetSector.mail.split(/[,;\s]+/) : []),
      ...sectorUsers.map(u => u.email),
    ]
      .map(e => e.trim())
      .filter(e => e.includes("@"));
  }

  // El campo notificationEmails ya trae los del sector + los agregados manualmente
  const allToEmails =
    manualEmails.length > 0
      ? Array.from(new Set(manualEmails))
      : Array.from(new Set(sectorEmails));
  if (allToEmails.length === 0 && senderEmail.includes("@")) {
    allToEmails.push(senderEmail);
  }
  const finalRecipients = allToEmails.join(", ");

  // 2. Crear PendingTransfer
  await prisma.pendingTransfer.create({
    data: {
      employeeId: empId,
      targetProfileId: targetProfileId,
      targetSectorId: targetSectorId,
      gaps: JSON.stringify(gapsToCreate),
      sourceProfileId: empleado.jobProfileId,
      sourceSectorId: empleado.sectorId,
    },
  });

  const emailSubject = `Comunicación de Cambio de Puesto: ${empleado.name} (Legajo ${empleado.legajo})`;
  const cleanGaps = gapsToCreate.map(g => g.trim()).filter(Boolean);
  const hasGaps = cleanGaps.length > 0;

  const plainTextBody = hasGaps
    ? [
        `Hola, se informa que RRHH ha evaluado a ${empleado.name} (Legajo: ${empleado.legajo}) para el cambio al puesto de "${targetProfile.title}" en el sector ${targetSector?.name || ""}.`,
        ``,
        `Las brechas detectadas según la evaluación inicial son las siguientes capacitaciones que debe realizar:`,
        ...cleanGaps.map(g => `  • ${g}`),
        ``,
        `IMPORTANTE: Tiene un plazo máximo de 90 días para realizar las capacitaciones indicadas y su correspondiente evaluación de eficacia para la liberación del puesto.`,
        ``,
        `Por favor, ingrese al sistema de Formación y Competencia (sección Transferencias) para confirmar la recepción y programar las fechas de dichas capacitaciones.`,
        ``,
        `---`,
        `Este es un mensaje automático de comunicación interna (No Responder).`,
      ].join("\r\n")
    : [
        `Hola, se informa que RRHH ha evaluado a ${empleado.name} (Legajo: ${empleado.legajo}) para el cambio al puesto de "${targetProfile.title}" en el sector ${targetSector?.name || ""}.`,
        ``,
        `Resultado de la evaluación: El empleado NO presenta brechas de capacitación para este perfil, por lo que puede ser liberado al puesto cuando el Jefe del Sector lo desee.`,
        ``,
        `Por favor, ingrese al sistema de Formación y Competencia (sección Transferencias) para confirmar la recepción del pase al nuevo puesto.`,
        ``,
        `---`,
        `Este es un mensaje automático de comunicación interna (No Responder).`,
      ].join("\r\n");

  let emailSent = false;
  let emailError = "";
  try {
    const brechasHtml = cleanGaps.map(g => `<li style="margin-bottom: 6px;">${g}</li>`).join("");

    const emailBody = hasGaps
      ? `
<div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <p>Hola,</p>
  <p>Se informa que RRHH ha evaluado a <strong>${empleado.name}</strong> (Legajo: <strong>${empleado.legajo}</strong>) para el cambio al puesto de <strong>${targetProfile.title}</strong> en el sector <strong>${targetSector?.name || "-"}</strong>.</p>
  
  <h3 style="color: #0f172a; margin-top: 16px; margin-bottom: 8px;">Brechas detectadas según la evaluación:</h3>
  <p style="margin-top: 0;">Las capacitaciones que debe realizar según la evaluación inicial son las siguientes:</p>
  <ul style="background: #f8fafc; padding: 12px 12px 12px 32px; border-left: 4px solid #0284c7; border-radius: 4px;">
    ${brechasHtml}
  </ul>

  <p style="color: #b91c1c; font-weight: bold; background: #fef2f2; padding: 12px; border-radius: 4px; border: 1px solid #fecaca;">
    IMPORTANTE: Cuenta con un plazo de 90 días para realizar las capacitaciones indicadas y su correspondiente evaluación de eficacia para la liberación del puesto.
  </p>

  <p>Por favor, ingrese al sistema (sección <strong>Transferencias</strong>) para confirmar la recepción y programar las fechas de estas capacitaciones.</p>
  <hr style="margin-top: 24px; border: none; border-top: 1px solid #e2e8f0;" />
  <p style="font-size: 12px; color: #64748b;"><em>Comunicación automática del Sistema de Formación y Competencia - AUBASA. Por favor, no responda a este mensaje.</em></p>
</div>`
      : `
<div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <p>Hola,</p>
  <p>Se informa que RRHH ha evaluado a <strong>${empleado.name}</strong> (Legajo: <strong>${empleado.legajo}</strong>) para el cambio al puesto de <strong>${targetProfile.title}</strong> en el sector <strong>${targetSector?.name || "-"}</strong>.</p>

  <p style="color: #166534; font-weight: bold; background: #f0fdf4; padding: 12px; border-radius: 4px; border: 1px solid #bbf7d0;">
    ✓ Resultado de la evaluación: El empleado NO tiene brechas pendientes para este perfil, por lo que puede ser liberado al puesto cuando el Jefe del Sector lo desee.
  </p>

  <p>Por favor, ingrese al sistema (sección <strong>Transferencias</strong>) para confirmar el pase al nuevo puesto.</p>
  <hr style="margin-top: 24px; border: none; border-top: 1px solid #e2e8f0;" />
  <p style="font-size: 12px; color: #64748b;"><em>Comunicación automática del Sistema de Formación y Competencia - AUBASA. Por favor, no responda a este mensaje.</em></p>
</div>`;

    if (finalRecipients) {
      const { sendMail } = await import("@/lib/mailer");
      const res = await sendMail({
        to: finalRecipients,
        subject: emailSubject,
        html: emailBody,
      });
      emailSent = res.sent;
      emailError = res.error || "";
    }
  } catch (error: any) {
    console.error("Error enviando email de transferencia:", error);
    emailError = error?.message || "ERROR";
  }

  revalidatePath("/transferencias");
  revalidatePath("/brechas");

  return {
    success: true,
    emailSent,
    emailError,
    mailtoData: {
      to: finalRecipients,
      cc: "",
      subject: emailSubject,
      body: plainTextBody,
    },
  };
}
