import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await context.params;
    const cleanId = (fileId || "").trim();
    if (!cleanId) {
      return new NextResponse("Archivo no especificado", { status: 400 });
    }

    const setting = await prisma.appSetting.findUnique({
      where: { id: `cloud_file_${cleanId}` }
    });

    if (!setting?.value) {
      return new NextResponse("Archivo no encontrado", { status: 404 });
    }

    const parsed = JSON.parse(setting.value);
    const buffer = Buffer.from(parsed.base64, "base64");
    const contentType = parsed.contentType || "application/octet-stream";
    const fileName = parsed.cleanName || "archivo";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        // Caché de navegador de 1 año para no volver a transferir el archivo
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (err) {
    console.error("Error sirviendo archivo /api/files/[fileId]:", err);
    return new NextResponse("Error al leer el archivo", { status: 500 });
  }
}
