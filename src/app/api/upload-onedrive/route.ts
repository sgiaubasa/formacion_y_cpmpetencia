import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

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

      // Si es el último fragmento, guardamos el manifiesto principal del archivo
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

    // Verificar si además hay un Webhook de Power Automate hacia OneDrive Corporativo
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
        console.warn("Error al enviar copia al Webhook de OneDrive:", err);
      }
    }

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
