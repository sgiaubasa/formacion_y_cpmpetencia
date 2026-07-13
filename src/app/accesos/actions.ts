"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { createClient } from '@supabase/supabase-js';

export async function addAccess(formData: FormData) {
  const email = formData.get("email") as string;
  const role = formData.get("role") as string; // "SGI", "RRHH", "SECTOR"
  const sectorIdStr = formData.get("sectorId") as string;
  const sectorId = sectorIdStr ? parseInt(sectorIdStr) : null;
  const cleanEmail = email.toLowerCase().trim();

  try {
    await prisma.appUser.upsert({
      where: { email: cleanEmail },
      update: {
        role,
        sectorId: role === "SECTOR" ? sectorId : null
      },
      create: {
        email: cleanEmail,
        role,
        sectorId: role === "SECTOR" ? sectorId : null
      }
    });
  } catch (error) {
    console.error("Error al guardar usuario en base de datos:", error);
    return; // Evitar que rompa la pagina
  }

  // Enviar invitación oficial por correo vía Supabase Admin
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (supabaseServiceKey) {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo: 'https://formacion-y-competencia.vercel.app/'
    });
    if (error) {
      console.error("Error al enviar invitación por correo:", error);
      // No lanzamos error para no interrumpir el flujo si falla el correo,
      // pero el usuario ya está agregado en la base de datos local.
    }
  }

  revalidatePath('/accesos');
}

export async function removeAccess(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  
  try {
    await prisma.appUser.delete({
      where: { id }
    });
  } catch (error) {
    console.error("Error al borrar:", error);
  }

  revalidatePath('/accesos');
}
