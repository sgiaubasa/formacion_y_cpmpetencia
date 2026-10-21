"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentRole, getUserEmail } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function saveProfileSignature(profileId: number, roleName: string, signatureData: string, signerName?: string) {
  const role = await getCurrentRole();
  const email = await getUserEmail();

  // Basic security: 
  if (roleName === 'RRHH' && role !== 'RRHH' && role !== 'ADMIN' && role !== 'SGI') {
    throw new Error("No tiene permisos para firmar como RRHH");
  }
  
  const updateData: any = {};
  const now = new Date();
  const displaySigner = signerName?.trim() || email;

  if (roleName === 'RRHH') {
    updateData.firmaRRHH = signatureData;
    updateData.fechaFirmaRRHH = now;
    updateData.emailFirmaRRHH = displaySigner;
  } else if (roleName === 'GerenteArea') {
    updateData.firmaGerenteArea = signatureData;
    updateData.fechaFirmaGerenteArea = now;
    updateData.emailFirmaGerenteArea = displaySigner;
  } else if (roleName === 'GerenteGeneral') {
    updateData.firmaGerenteGeneral = signatureData;
    updateData.fechaFirmaGerenteGeneral = now;
    updateData.emailFirmaGerenteGeneral = displaySigner;
  } else {
    throw new Error("Rol de firma inválido");
  }

  await prisma.jobProfile.update({
    where: { id: profileId },
    data: updateData
  });

  revalidatePath(`/perfiles/${profileId}`);
  return { success: true };
}
