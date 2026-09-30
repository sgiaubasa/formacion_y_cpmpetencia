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

  // Unificar correos manuales + correos del sector destino (y si ambos están vacíos, usar senderEmail)
  const allToEmails = Array.from(new Set([...manualEmails, ...sectorEmails]));
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
    ...(senderEmail ? [`- Propuesto por: ${senderEmail}`] : []),
    ``,
    `Capacitaciones a Planificar:`,
    ...(cleanGaps.length > 0
      ? cleanGaps.map(g => `  • ${g}`)
      : [`  • Sin brechas pendientes (cumple todos los requisitos del perfil)`]),
    ``,
    `Por favor, ingrese al sistema para confirmar el cambio.`,
  ].join("\r\n");

  let emailSent = false;
  let emailError = "";
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

    if (senderEmail) {
      emailBody += `<hr style="margin-top:20px;border:none;border-top:1px solid #e2e8f0;" /><p style="font-size:12px;color:#64748b;">Notificación generada por: <strong>${senderEmail}</strong> | <a href="https://formacion-y-competencia.vercel.app/transferencias">Ir a Transferencias</a></p>`;
    }

    if (finalRecipients) {
      const { sendMail } = await import("@/lib/mailer");
      const res = await sendMail({
        replyTo: senderEmail || undefined,
        to: finalRecipients,
        cc: senderEmail || undefined,
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
      cc: senderEmail || "",
      subject: emailSubject,
      body: plainTextBody,
    },
  };
}
