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
    if (trimmed.includes("action=embedview") || trimmed.includes("embed")) {
      return {
        embedUrl: trimmed,
        isOneDrive: true,
        isGoogleDrive: false,
        canDirectVideoTag: false
      };
    }
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

// Subida 100% automática por fragmentos (chunks de 2.2 MB) para soportar PDFs, imágenes y videos .mp4
// directamente desde la app, generando una URL automática que se reproduce dentro de la app
// y queda cacheada en la red CDN de Vercel (0 consumo de cuota repetida).
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
    const CHUNK_SIZE = 2.2 * 1024 * 1024; // 2.2 MB por bloque (por debajo del límite de 4.5 MB de Vercel)
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Si cabe en 1 solo envío, enviamos directo
    if (totalChunks === 1) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      fd.append("fileId", fileId);

      const res = await fetch("/api/upload-onedrive", {
        method: "POST",
        body: fd
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        return {
          ok: false,
          error: data.error || "No se pudo subir el archivo."
        };
      }

      return {
        ok: true,
        url: data.url,
        name: data.name || file.name,
        provider: data.provider
      };
    }

    // Si el archivo es más grande (ej: Video .mp4 o PDF pesado), subir automáticamente por partes
    let finalUrl = "";
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const blobPart = file.slice(start, end);

      const fd = new FormData();
      fd.append("chunk", blobPart, file.name);
      fd.append("fileId", fileId);
      fd.append("chunkIndex", String(chunkIndex));
      fd.append("totalChunks", String(totalChunks));
      fd.append("fileName", file.name);
      fd.append("contentType", file.type || "application/octet-stream");
      fd.append("totalSize", String(file.size));
      fd.append("category", category);

      const res = await fetch("/api/upload-onedrive", {
        method: "POST",
        body: fd
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        return {
          ok: false,
          error: data.error || `Error al subir parte ${chunkIndex + 1} de ${totalChunks}.`
        };
      }

      if (data.url) {
        finalUrl = data.url;
      }
    }

    return {
      ok: true,
      url: finalUrl || `/api/files/${fileId}`,
      name: file.name,
      provider: "database"
    };
  } catch (err: any) {
    console.error("Error en uploadFileZeroEgress:", err);
    return {
      ok: false,
      error: "Error de conexión al subir el archivo. Intentá nuevamente."
    };
  }
}
