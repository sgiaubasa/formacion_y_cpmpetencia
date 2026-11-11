"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

const CREDENTIALS_SETTING_ID = "user_credentials_v1";

interface StoredCredential {
  passwordHash: string;
  updatedAt: string;
}

type CredentialsMap = Record<string, StoredCredential>;

function hashPassword(email: string, password: string): string {
  const cleanEmail = email.toLowerCase().trim();
  return crypto
    .createHash("sha256")
    .update(`sgc-aubasa-v1:${cleanEmail}:${password}`)
    .digest("hex");
}

async function getCredentialsMap(): Promise<CredentialsMap> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { id: CREDENTIALS_SETTING_ID }
    });
    if (!setting?.value) return {};
    const parsed = JSON.parse(setting.value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveCredentialsMap(map: CredentialsMap): Promise<void> {
  await prisma.appSetting.upsert({
    where: { id: CREDENTIALS_SETTING_ID },
    update: { value: JSON.stringify(map) },
    create: { id: CREDENTIALS_SETTING_ID, value: JSON.stringify(map) }
  });
}

export async function getRoleForEmail(email: string) {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail) {
    return { role: "VIEWER", sectorName: "General" };
  }

  const user = await prisma.appUser.findFirst({
    where: {
      email: {
        equals: cleanEmail,
        mode: "insensitive"
      }
    },
    include: { sector: true }
  });

  if (user) {
    if (user.role === "SECTOR") {
      return {
        role: `SECTOR_${user.sectorId}`,
        sectorName: user.sector?.name || "General"
      };
    }
    return {
      role: user.role,
      sectorName: user.role === "SGI" ? "SGI" : "Recursos Humanos"
    };
  }

  // Respaldo por si el correo figura directamente en la tabla de sectores
  const allSectors = await prisma.sector.findMany();
  const matchedSector = allSectors.find((s) =>
    (s.mail || "")
      .toLowerCase()
      .split(/[,;\s]+/)
      .map((m) => m.trim())
      .includes(cleanEmail)
  );

  if (matchedSector) {
    return {
      role: `SECTOR_${matchedSector.id}`,
      sectorName: matchedSector.name
    };
  }

  return { role: "VIEWER", sectorName: "General" };
}

export async function authenticateUserAction(email: string, password: string) {
  try {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !password) {
      return { ok: false, error: "Ingresá tu correo y contraseña." };
    }

    const { role, sectorName } = await getRoleForEmail(cleanEmail);
    if (role === "VIEWER") {
      return {
        ok: false,
        error:
          "Tu correo no se encuentra habilitado en el listado de Accesos. Solicitá el alta a SGI o RRHH."
      };
    }

    const creds = await getCredentialsMap();
    const existingCred = creds[cleanEmail];
    const incomingHash = hashPassword(cleanEmail, password);

    if (!existingCred) {
      // Migración transparente desde Supabase Auth: en el primer inicio de sesión del usuario habilitado,
      // se registra su contraseña directamente en PostgreSQL sin depender de Supabase Auth.
      if (password.trim().length < 4) {
        return {
          ok: false,
          error: "La contraseña debe tener al menos 4 caracteres."
        };
      }
      creds[cleanEmail] = {
        passwordHash: incomingHash,
        updatedAt: new Date().toISOString()
      };
      await saveCredentialsMap(creds);
    } else if (existingCred.passwordHash !== incomingHash) {
      return {
        ok: false,
        error: "Correo o contraseña incorrectos."
      };
    }

    const cookieStore = await cookies();
    cookieStore.set("activeRole", role, { path: "/", sameSite: "lax" });
    cookieStore.set("userEmail", cleanEmail, { path: "/", sameSite: "lax" });

    return {
      ok: true,
      user: {
        email: cleanEmail,
        role,
        sectorName
      }
    };
  } catch (err: any) {
    console.error("Error en authenticateUserAction:", err);
    return {
      ok: false,
      error: "Error al validar credenciales en la base de datos. Intentá nuevamente."
    };
  }
}

export async function changeUserPasswordAction(
  email: string,
  currentPassword: string,
  newPassword: string
) {
  try {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      return { ok: false, error: "Ingresá tu correo electrónico." };
    }
    if (!newPassword || newPassword.trim().length < 6) {
      return { ok: false, error: "La nueva contraseña debe tener al menos 6 caracteres." };
    }

    const { role } = await getRoleForEmail(cleanEmail);
    if (role === "VIEWER") {
      return { ok: false, error: "El correo ingresado no está registrado en el sistema." };
    }

    const creds = await getCredentialsMap();
    const existingCred = creds[cleanEmail];

    if (existingCred && currentPassword) {
      const currentHash = hashPassword(cleanEmail, currentPassword);
      if (existingCred.passwordHash !== currentHash) {
        return {
          ok: false,
          error:
            "La contraseña actual no coincide. Si la olvidaste, pedile a SGI o RRHH que blanquee tu clave en la sección Accesos."
        };
      }
    } else if (existingCred && !currentPassword) {
      return {
        ok: false,
        error:
          "Debés ingresar tu contraseña actual para cambiarla, o solicitar un blanqueo de clave a SGI / RRHH."
      };
    }

    creds[cleanEmail] = {
      passwordHash: hashPassword(cleanEmail, newPassword),
      updatedAt: new Date().toISOString()
    };
    await saveCredentialsMap(creds);

    return {
      ok: true,
      message: "Contraseña actualizada con éxito. Ya podés ingresar con tu nueva clave."
    };
  } catch (err: any) {
    console.error("Error en changeUserPasswordAction:", err);
    return { ok: false, error: "No se pudo actualizar la contraseña." };
  }
}

export async function getConfiguredCredentialEmails(): Promise<string[]> {
  const creds = await getCredentialsMap();
  return Object.keys(creds);
}

export async function resetOrSetUserPasswordClientAction(
  email: string,
  newPassword?: string
): Promise<{ ok: boolean; status: "blanqueada" | "asignada"; message: string }> {
  const cleanEmail = (email || "").toLowerCase().trim();
  if (!cleanEmail) {
    return { ok: false, status: "blanqueada", message: "Correo inválido" };
  }

  const creds = await getCredentialsMap();
  const cleanPass = (newPassword || "").trim();

  if (cleanPass.length >= 4) {
    creds[cleanEmail] = {
      passwordHash: hashPassword(cleanEmail, cleanPass),
      updatedAt: new Date().toISOString()
    };
    await saveCredentialsMap(creds);
    revalidatePath("/accesos");
    return {
      ok: true,
      status: "asignada",
      message: `Se asignó la nueva clave para ${cleanEmail}.`
    };
  } else {
    delete creds[cleanEmail];
    await saveCredentialsMap(creds);
    revalidatePath("/accesos");
    return {
      ok: true,
      status: "blanqueada",
      message: `Clave blanqueada para ${cleanEmail}. En su próximo ingreso podrá escribir su nueva contraseña directamente.`
    };
  }
}

export async function adminResetUserPasswordAction(formData: FormData) {
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  const newPass = (formData.get("newPassword") as string | null)?.trim();
  if (!email) return;

  await resetOrSetUserPasswordClientAction(email, newPass || undefined);
}

export async function logoutUserAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("activeRole");
    cookieStore.delete("userEmail");
  } catch {
    // ignore
  }
  return { ok: true };
}
