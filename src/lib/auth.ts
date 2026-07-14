import { cookies } from "next/headers";

export async function getCurrentRole() {
  const cookieStore = await cookies();
  const role = cookieStore.get("activeRole")?.value || "VIEWER"; // Default to VIEWER
  return role;
}

export async function getUserEmail() {
  const cookieStore = await cookies();
  return cookieStore.get("userEmail")?.value || "usuario@desconocido.com";
}

export async function isSectorRole(role: string) {
  return role.startsWith("SECTOR_");
}

export async function getSectorIdFromRole(role: string) {
  if (role.startsWith("SECTOR_")) {
    return parseInt(role.replace("SECTOR_", ""));
  }
  return null;
}

export async function getAllowedSectorNames(role: string, mySectorName: string): Promise<string[]> {
  if (role === "SGI" || role === "RRHH" || role === "ADMIN") return [];
  
  if (mySectorName === "Gerencia de Prevencion y Seguridad Integral") {
    return [
      "Gerencia de Prevencion y Seguridad Integral",
      "Asistencia Vial",
      "CCM",
      "Seguridad Patrimonial"
    ];
  }

  return [mySectorName];
}
