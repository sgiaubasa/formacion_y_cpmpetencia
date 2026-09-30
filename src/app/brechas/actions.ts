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

  // Resolver destinatarios: los ingresados manualmente o los del sector destino
  let recipientsList = rawNotificationEmails
    .split(/[,;]+/)
    .map(e => e.trim())
    .filter(Boolean);

  if (recipientsList.length === 0 && targetSectorId) {
    const sectorUsers = await prisma.appUser.findMany({
      where: { sectorId: targetSectorId },
    });
    const sectorMails = [
      ...(targetSector?.mail ? targetSector.mail.split(/[,;]+/) : []),
      ...sectorUsers.map(u => u.email),
    ]
      .map(e => e.trim())
      .filter(Boolean);
    recipientsList = Array.from(new Set(sectorMails));
  }

  const finalRecipients = recipientsList.join(", ");

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

  const emailSubject = `Atención: Transferencia pendiente de aprobación para ${empleado.name}`;
  const cleanGaps = gapsToCreate.map(g => g.trim()).filter(Boolean);

  const plainTextBody = [
    `Hola, RRHH ha propuesto a ${empleado.name} para el puesto de "${targetProfile.title}" en su sector (${targetSector?.name || ""}).`,
    ``,
    `Para que este cambio se haga efectivo, usted DEBE ingresar al sistema de Formación y Competencia (sección Transferencias) y CONFIRMAR la recepción:`,
    `https://formacion-y-competencia.vercel.app/transferencias`,
    ``,
    `IMPORTANTE: Cuenta con un plazo de 90 días como máximo para programar y completar las capacitaciones faltantes, de manera que se cumpla con la evaluación inicial obligatoria.`,
    ``,
    `Detalles:`,
    `- Empleado: ${empleado.name} (Legajo: ${empleado.legajo})`,
    `- Nuevo Puesto: ${targetProfile.title}`,
    `- Sector Destino: ${targetSector?.name || "-"}`,
    ``,
    `Capacitaciones a Planificar:`,
    ...(cleanGaps.length > 0
      ? cleanGaps.map(g => `  • ${g}`)
      : [`  • Sin brechas pendientes (cumple todos los requisitos del perfil)`]),
    ``,
    `Por favor, ingrese al sistema para confirmar el cambio.`,
  ].join("\r\n");

  let emailSent = false;
  try {
    const templateSetting = await prisma.appSetting.findUnique({
      where: { id: "email_template_transferencia" },
    });

    let emailBody =
      templateSetting?.value ||
      `<p>Hola, RRHH ha propuesto a <strong>{{nombre}}</strong> para el puesto de <strong>{{puesto}}</strong> en su sector.</p>
<p>Para que este cambio se haga efectivo, usted <strong>DEBE ingresar al sistema (sección Transferencias) y CONFIRMAR la recepción</strong>.</p>
<p style="color: red; font-weight: bold;">IMPORTANTE: Cuenta con un plazo de 90 días como máximo para programar y completar estas capacitaciones.</p>
<h3>Detalles:</h3>
<ul>
  <li><strong>Empleado:</strong> {{nombre}} (Legajo: {{legajo}})</li>
  <li><strong>Nuevo Puesto:</strong> {{puesto}}</li>
</ul>
<h3>Capacitaciones a Planificar:</h3>
<ul>
  {{brechas}}
</ul>`;

    emailBody = emailBody.replace(/\{\{nombre\}\}/g, empleado.name);
    emailBody = emailBody.replace(/\{\{puesto\}\}/g, targetProfile.title);
    emailBody = emailBody.replace(/\{\{legajo\}\}/g, empleado.legajo);

    const brechasHtml =
      cleanGaps.length > 0
        ? cleanGaps.map(g => `<li>${g}</li>`).join("")
        : `<li>Sin brechas pendientes (cumple con todos los requisitos)</li>`;
    emailBody = emailBody.replace(/\{\{brechas\}\}/g, brechasHtml);

    if (finalRecipients) {
      const { sendMail } = await import("@/lib/mailer");
      const res = await sendMail({
        from: `"RRHH - SGC" <${senderEmail || "rrhh@aubasa.com.ar"}>`,
        replyTo: senderEmail || undefined,
        to: finalRecipients,
        cc: senderEmail || undefined,
        subject: emailSubject,
        html: emailBody,
      });
      emailSent = res.sent;
    }
  } catch (error) {
    console.error("Error enviando email de transferencia:", error);
  }

  revalidatePath("/transferencias");
  revalidatePath("/brechas");

  return {
    success: true,
    emailSent,
    mailtoData: {
      to: finalRecipients,
      cc: senderEmail || "",
      subject: emailSubject,
      body: plainTextBody,
    },
  };
}
