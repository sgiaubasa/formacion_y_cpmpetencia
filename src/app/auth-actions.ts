"use server";

import { prisma } from "@/lib/prisma";

export async function getRoleForEmail(email: string) {
  if (email === "rrhh@aubasa.com.ar" || email === "admin@aubasa.com.ar") {
    return { role: "ADMIN", sectorName: "Recursos Humanos" };
  }

  const sector = await prisma.sector.findFirst({
    where: { mail: email },
    select: { role: true, name: true }
  });
  
  if (sector) {
    return { role: sector.role, sectorName: sector.name };
  }
  
  return { role: "VIEWER", sectorName: "General" }; // default fallback
}
