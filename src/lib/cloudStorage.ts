export const DEFAULT_ONEDRIVE_FOLDER_URL =
  "https://aubasa-my.sharepoint.com/";

export function isOneDriveOrSharePointUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("sharepoint.com") ||
    lower.includes("1drv.ms") ||
    lower.includes("onedrive.live.com")
  );
}

export function isGoogleDriveUrl(url: string): boolean {
  return url.toLowerCase().includes("drive.google.com");
}

export function getEmbedPreviewUrl(url: string): {
  embedUrl: string;
  isOneDrive: boolean;
  isGoogleDrive: boolean;
  canDirectVideoTag: boolean;
} {
  const trimmed = (url || "").trim();
  const isOneDrive = isOneDriveOrSharePointUrl(trimmed);
  const isGoogleDrive = isGoogleDriveUrl(trimmed);

  // Google Drive: convertir /file/d/ID/view -> /file/d/ID/preview
  const gdriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdriveMatch) {
    return {
      embedUrl: `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`,
      isOneDrive: false,
      isGoogleDrive: true,
      canDirectVideoTag: false
    };
  }

  // SharePoint / OneDrive Corporativo
  if (isOneDrive) {
    // Si ya es un link de embed o download, respetarlo
    if (trimmed.includes("action=embedview") || trimmed.includes("embed")) {
      return {
        embedUrl: trimmed,
        isOneDrive: true,
        isGoogleDrive: false,
        canDirectVideoTag: false
      };
    }
    // Para links compartidos de SharePoint (:b:, :v:, :w:, :p:) agregamos action=embedview si corresponde
    const hasQuery = trimmed.includes("?");
    const embedCandidate = trimmed.includes("sharepoint.com")
      ? `${trimmed}${hasQuery ? "&" : "?"}action=embedview`
      : trimmed;

    return {
      embedUrl: embedCandidate,
      isOneDrive: true,
      isGoogleDrive: false,
      canDirectVideoTag: false
    };
  }

  const lower = trimmed.toLowerCase().split("?")[0];
  const canDirectVideoTag =
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".ogg") ||
    lower.endsWith(".mov") ||
    trimmed.startsWith("/api/files/");

  return {
    embedUrl: trimmed,
    isOneDrive: false,
    isGoogleDrive: false,
    canDirectVideoTag
  };
}

export async function uploadFileZeroEgress(
  file: File,
  category: "evidencia" | "material" | "video" = "evidencia"
): Promise<{
  ok: boolean;
  url?: string;
  name?: string;
  provider?: "onedrive" | "database";
  error?: string;
}> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category);

    const res = await fetch("/api/upload-onedrive", {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error:
          data.error ||
          "No se pudo subir el archivo. Podés pegar el enlace compartido de tu OneDrive AUBASA."
      };
    }

    return {
      ok: true,
      url: data.url,
      name: data.name || file.name,
      provider: data.provider
    };
  } catch (err: any) {
    console.error("Error en uploadFileZeroEgress:", err);
    return {
      ok: false,
      error:
        "Error de red al subir el archivo. Te recomendamos subirlo a tu OneDrive Corporativo y pegar el link compartido."
    };
  }
}
