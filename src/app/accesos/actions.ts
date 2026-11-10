"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { setEfficacyEvaluatorConfig } from "@/lib/efficacyTraceability";
import { adminResetUserPasswordAction } from "@/app/auth-actions";

async function syncSectorMail(sectorId: number | null) {
  if (!sectorId) return;
  try {
    const sectorUsers = await prisma.appUser.findMany({
      where: { role: "SECTOR", sectorId }
    });
    const emails = Array.from(
      new Set(sectorUsers.map((u) => u.email.trim().toLowerCase()).filter(Boolean))
    );
    await prisma.sector.update({
      where: { id: sectorId },
      data: { mail: emails.length > 0 ? emails.join(", ") : null }
    });
  } catch (e) {
    console.error("Error sincronizando correos del sector:", e);
  }
}

export async function addAccess(formData: FormData) {
  const email = formData.get("email") as string;
  const fullName = (formData.get("fullName") as string | null)?.trim() || "";
  const role = formData.get("role") as string; // "SGI", "RRHH", "SECTOR"
  const sectorIdStr = formData.get("sectorId") as string;
  const sectorId = sectorIdStr ? parseInt(sectorIdStr) : null;
  const isManager = formData.get("isManager") === "on";
  const canEvaluateEfficacy = formData.get("canEvaluateEfficacy") === "on";
  const initialPassword = (formData.get("initialPassword") as string | null)?.trim() || "";
  const cleanEmail = email.toLowerCase().trim();

  try {
    await prisma.appUser.upsert({
      where: { email: cleanEmail },
      update: {
        role,
        sectorId: role === "SECTOR" ? sectorId : null,
        isManager
      },
      create: {
        email: cleanEmail,
        role,
        sectorId: role === "SECTOR" ? sectorId : null,
        isManager
      }
    });

    await setEfficacyEvaluatorConfig(cleanEmail, {
      canEvaluate: canEvaluateEfficacy,
      fullName
    });

    if (initialPassword) {
      const passForm = new FormData();
      passForm.set("email", cleanEmail);
      passForm.set("newPassword", initialPassword);
      await adminResetUserPasswordAction(passForm);
    }

    if (role === "SECTOR" && sectorId) {
      await syncSectorMail(sectorId);
    }
  } catch (error) {
    console.error("Error al guardar usuario en base de datos:", error);
    return;
  }

  revalidatePath("/accesos");
  revalidatePath("/brechas");
}

export async function updateUserEfficacyPermission(formData: FormData) {
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const fullName = (formData.get("fullName") as string)?.trim();
  const canEvaluate = formData.get("canEvaluate") === "true";

  if (!email) return;

  await setEfficacyEvaluatorConfig(email, {
    canEvaluate,
    fullName
  });

  revalidatePath("/accesos");
  revalidatePath("/brechas");
  revalidatePath("/plan-anual");
}

export async function removeAccess(formData: FormData) {
  const id = parseInt(formData.get("id") as string);

  try {
    const user = await prisma.appUser.findUnique({ where: { id } });
    await prisma.appUser.delete({
      where: { id }
    });
    if (user?.sectorId) {
      await syncSectorMail(user.sectorId);
    }
  } catch (error) {
    console.error("Error al borrar:", error);
  }

  revalidatePath("/accesos");
  revalidatePath("/brechas");
}
