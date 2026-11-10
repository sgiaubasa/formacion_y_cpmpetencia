import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

async function sendCopyToOneDriveWebhook(params: {
  fileName: string;
  originalName: string;
  contentType: string;
  category: string;
  base64: string;
}) {
  try {
    let oneDriveWebhookUrl = process.env.POWER_AUTOMATE_ONEDRIVE_WEBHOOK_URL || "";
    const setting = await prisma.appSetting.findUnique({
      where: { id: "onedrive_upload_webhook_url" }
    });
    if (setting?.value?.trim()) {
      oneDriveWebhookUrl = setting.value.trim();
    }
    if (!oneDriveWebhookUrl) return;

    await fetch(oneDriveWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
  } catch (err) {
    console.warn("No se pudo enviar copia automática al Webhook de OneDrive:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const category = (formData.get("category") as string | null) || "evidencia";
    const incomingFileId = (formData.get("fileId") as string | null)?.trim();
    const fileId =
      incomingFileId || `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // MODO 1: Subida automática por fragmentos (chunks) para videos .mp4 o PDFs grandes
    const chunkBlob = formData.get("chunk") as File | null;
    if (chunkBlob) {
      const chunkIndex = parseInt((formData.get("chunkIndex") as string) || "0", 10);
      const totalChunks = parseInt((formData.get("totalChunks") as string) || "1", 10);
      const originalName = (formData.get("fileName") as string) || "archivo";
      const contentType =
        (formData.get("contentType") as string) || "application/octet-stream";

      const cleanName = originalName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      const bytes = await chunkBlob.arrayBuffer();
      const base64Part = Buffer.from(bytes).toString("base64");

      const partKey = `cloud_file_${fileId}_part_${chunkIndex}`;
      await prisma.appSetting.upsert({
        where: { id: partKey },
        update: { value: base64Part },
        create: { id: partKey, value: base64Part }
      });

      // Si es el último fragmento, guardamos el manifiesto principal y enviamos copia a OneDrive
      if (chunkIndex === totalChunks - 1) {
        const manifest = JSON.stringify({
          isChunked: true,
          totalChunks,
          name: originalName,
          cleanName,
          contentType,
          category,
          createdAt: new Date().toISOString()
        });

        await prisma.appSetting.upsert({
          where: { id: `cloud_file_${fileId}` },
          update: { value: manifest },
          create: { id: `cloud_file_${fileId}`, value: manifest }
        });

        // Reconstruir archivo completo para enviarlo a OneDrive si el webhook está activo (hasta 25 MB)
        if (totalChunks <= 12) {
          try {
            const partIds = Array.from(
              { length: totalChunks },
              (_, idx) => `cloud_file_${fileId}_part_${idx}`
            );
            const partRows = await prisma.appSetting.findMany({
              where: { id: { in: partIds } }
            });
            const partMap = new Map<string, string>();
            for (const r of partRows) partMap.set(r.id, r.value);
            const buffers: Buffer[] = [];
            for (let idx = 0; idx < totalChunks; idx++) {
              const b64 = partMap.get(`cloud_file_${fileId}_part_${idx}`);
              if (b64) buffers.push(Buffer.from(b64, "base64"));
            }
            const fullBase64 = Buffer.concat(buffers).toString("base64");
            await sendCopyToOneDriveWebhook({
              fileName: `${category.toUpperCase()}_${Date.now()}_${cleanName}`,
              originalName,
              contentType,
              category,
              base64: fullBase64
            });
          } catch {
            // ignore
          }
        }
      }

      return NextResponse.json({
        ok: true,
        url: `/api/files/${fileId}`,
        name: originalName,
        provider: "database"
      });
    }

    // MODO 2: Subida directa en 1 bloque (archivos <= 2.2 MB)
    const file = formData.get("file") as File | null;
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

    // 1. Guardar siempre con URL interna (/api/files/...) cacheada en Vercel CDN para verse dentro de la App sin login
    const payload = JSON.stringify({
      isChunked: false,
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

    // 2. Enviar automáticamente una copia física del archivo a tu OneDrive Corporativo vía Power Automate
    await sendCopyToOneDriveWebhook({
      fileName: `${category.toUpperCase()}_${Date.now()}_${cleanName}`,
      originalName: file.name,
      contentType,
      category,
      base64: base64Data
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
