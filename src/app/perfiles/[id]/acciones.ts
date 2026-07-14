"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentRole, getUserEmail } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function saveProfileSignature(profileId: number, roleName: string, signatureData: string) {
  const role = await getCurrentRole();
  const email = await getUserEmail();

  // Basic security: 
  if (roleName === 'RRHH' && role !== 'RRHH' && role !== 'ADMIN') {
    throw new Error("No tiene permisos para firmar como RRHH");
  }
  // Gerente General can be RRHH or ADMIN in this system (or a specific role if they add it later)
  // Gerente de Área signs if they are SECTOR (and we could check if it matches the profile's gerencia)
  
  const updateData: any = {};
  const now = new Date();

  if (roleName === 'RRHH') {
    updateData.firmaRRHH = signatureData;
    updateData.fechaFirmaRRHH = now;
    updateData.emailFirmaRRHH = email;
  } else if (roleName === 'GerenteArea') {
    updateData.firmaGerenteArea = signatureData;
    updateData.fechaFirmaGerenteArea = now;
    updateData.emailFirmaGerenteArea = email;
  } else if (roleName === 'GerenteGeneral') {
    updateData.firmaGerenteGeneral = signatureData;
    updateData.fechaFirmaGerenteGeneral = now;
    updateData.emailFirmaGerenteGeneral = email;
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
