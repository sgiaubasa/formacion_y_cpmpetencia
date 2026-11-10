import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string | null) || "evidencia";

    if (!file || file.size === 0) {
      return NextResponse.json(
        { ok: false, error: "No se recibió ningún archivo válido." },
        { status: 400 }
      );
    }

    const cleanName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString("base64");
    const contentType = file.type || "application/octet-stream";

    // 1. Verificar si existe Webhook de Power Automate hacia OneDrive Corporativo (AUBASA)
    let oneDriveWebhookUrl = process.env.POWER_AUTOMATE_ONEDRIVE_WEBHOOK_URL || "";
    try {
      const setting = await prisma.appSetting.findUnique({
        where: { id: "onedrive_upload_webhook_url" }
      });
      if (setting?.value?.trim()) {
        oneDriveWebhookUrl = setting.value.trim();
      }
    } catch {
      // ignore
    }

    if (oneDriveWebhookUrl) {
      try {
        const webhookRes = await fetch(oneDriveWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: `${Date.now()}-${cleanName}`,
            originalName: file.name,
            contentType,
            category,
            base64: base64Data
          })
        });

        if (webhookRes.ok) {
          const text = await webhookRes.text();
          let returnedUrl = "";
          try {
            const parsed = JSON.parse(text);
            returnedUrl =
              parsed.url || parsed.webUrl || parsed.shareUrl || parsed.link || "";
          } catch {
            if (text.trim().startsWith("http")) {
              returnedUrl = text.trim();
            }
          }

          if (returnedUrl) {
            return NextResponse.json({
              ok: true,
              url: returnedUrl,
              name: file.name,
              provider: "onedrive"
            });
          }
        }
      } catch (err) {
        console.warn("Error al subir archivo mediante Webhook de OneDrive:", err);
      }
    }

    // 2. Para videos pesados (> 4 MB) sin Webhook activo, guiar a usar link directo de OneDrive / Drive / YouTube
    const isVideo = contentType.startsWith("video/") || cleanName.toLowerCase().endsWith(".mp4");
    const MAX_DB_BYTES = 4 * 1024 * 1024; // 4 MB
    if (buffer.length > MAX_DB_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: isVideo
            ? "Los videos pesados (.mp4 mayores a 4 MB) deben alojarse en OneDrive Corporativo AUBASA, Google Drive o YouTube para no consumir cuota de transferencia. Subilo a tu OneDrive y pegá el link compartido abajo."
            : "El archivo supera los 4 MB para almacenamiento interno. Subilo a tu OneDrive Corporativo AUBASA y pegá el link compartido, o configurá el Webhook de OneDrive en Configuración."
        },
        { status: 413 }
      );
    }

    // 3. Almacenamiento interno libre de Supabase Storage (con caché inmutable) para PDFs y evidencias livianas
    const fileId = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const payload = JSON.stringify({
      name: file.name,
      cleanName,
      contentType,
      category,
      createdAt: new Date().toISOString(),
      base64: base64Data
    });

    await prisma.appSetting.upsert({
      where: { id: `cloud_file_${fileId}` },
      update: { value: payload },
      create: { id: `cloud_file_${fileId}`, value: payload }
    });

    return NextResponse.json({
      ok: true,
      url: `/api/files/${fileId}`,
      name: file.name,
      provider: "database"
    });
  } catch (err: any) {
    console.error("Error en /api/upload-onedrive:", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo procesar el archivo." },
      { status: 500 }
    );
  }
}
