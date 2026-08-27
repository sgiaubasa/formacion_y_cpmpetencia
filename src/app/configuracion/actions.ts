"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";

export async function updateEmailTemplateAction(formData: FormData) {
  const role = await getCurrentRole();
  if (role !== "ADMIN" && role !== "RRHH" && role !== "SGI") throw new Error("Unauthorized");

  const templateId = formData.get("templateId") as string;
  const value = formData.get("value") as string;

  await prisma.appSetting.update({
    where: { id: templateId },
    data: { value }
  });

  revalidatePath('/configuracion');
  return { success: true };
}
