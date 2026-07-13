"use server";

import { prisma } from "@/lib/prisma";

export async function getRoleForEmail(email: string) {
  const user = await prisma.appUser.findUnique({
    where: { email },
    include: { sector: true }
  });

  if (user) {
    if (user.role === "SECTOR") {
      return { role: `SECTOR_${user.sectorId}`, sectorName: user.sector?.name || "General" };
    }
    return { role: user.role, sectorName: user.role === "SGI" ? "SGI" : "Recursos Humanos" };
  }

  return { role: "VIEWER", sectorName: "General" };
}
