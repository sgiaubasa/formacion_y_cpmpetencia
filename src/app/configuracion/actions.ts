"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";

export async function updateEmailTemplateAction(formData: FormData) {
  const role = await getCurrentRole();
  if (role !== "ADMIN" && role !== "RRHH" && role !== "SGI") throw new Error("Unauthorized");

  const templateId = formData.get("templateId") as string;
  const value = formData.get("value") as string;

  await prisma.appSetting.upsert({
    where: { id: templateId },
    update: { value },
    create: { id: templateId, value }
  });

  revalidatePath('/configuracion');
}

export async function updateSmtpSettingsAction(formData: FormData) {
  const role = await getCurrentRole();
  if (role !== "ADMIN" && role !== "RRHH" && role !== "SGI") throw new Error("Unauthorized");

  const keys = [
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_pass",
    "email_webhook_url",
  ];

  for (const key of keys) {
    const val = ((formData.get(key) as string) || "").trim();
    // Si smtp_pass viene vacío y ya existía, no lo pisamos a menos que se borre el usuario
    if (key === "smtp_pass" && !val && ((formData.get("smtp_user") as string) || "").trim()) {
      continue;
    }
    await prisma.appSetting.upsert({
      where: { id: key },
      update: { value: val },
      create: { id: key, value: val },
    });
  }

  revalidatePath("/configuracion");
}
