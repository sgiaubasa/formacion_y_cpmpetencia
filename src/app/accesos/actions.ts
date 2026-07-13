"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addAccess(formData: FormData) {
  const email = formData.get("email") as string;
  const role = formData.get("role") as string; // "SGI", "RRHH", "SECTOR"
  const sectorIdStr = formData.get("sectorId") as string;
  const sectorId = sectorIdStr ? parseInt(sectorIdStr) : null;

  await prisma.appUser.create({
    data: {
      email: email.toLowerCase().trim(),
      role,
      sectorId: role === "SECTOR" ? sectorId : null
    }
  });

  revalidatePath('/accesos');
}

export async function removeAccess(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  
  await prisma.appUser.delete({
    where: { id }
  });

  revalidatePath('/accesos');
}
