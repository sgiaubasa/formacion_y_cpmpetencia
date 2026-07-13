"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function enviarARevision(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  await prisma.jobProfile.update({
    where: { id },
    data: { status: 'PENDIENTE_SECTOR' }
  });
  revalidatePath('/perfiles');
}

export async function aprobarPerfil(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  await prisma.jobProfile.update({
    where: { id },
    data: { status: 'VIGENTE' }
  });
  revalidatePath('/perfiles');
}

export async function devolverAAdmin(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  await prisma.jobProfile.update({
    where: { id },
    data: { status: 'DEVUELTO_A_ADMIN' }
  });
  revalidatePath('/perfiles');
}

export async function borrarPerfil(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  await prisma.jobProfile.update({
    where: { id },
    data: { isActive: false }
  });
  revalidatePath('/perfiles');
}
