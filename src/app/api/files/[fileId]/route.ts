import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
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
    const contentType = parsed.contentType || "application/octet-stream";
    const fileName = parsed.cleanName || "archivo";

    let fullBuffer: Buffer;

    if (parsed.isChunked && typeof parsed.totalChunks === "number") {
      const partIds = Array.from(
        { length: parsed.totalChunks },
        (_, idx) => `cloud_file_${cleanId}_part_${idx}`
      );
      const partRows = await prisma.appSetting.findMany({
        where: { id: { in: partIds } }
      });

      const partMap = new Map<string, string>();
      for (const r of partRows) {
        partMap.set(r.id, r.value);
      }

      const buffers: Buffer[] = [];
      for (let idx = 0; idx < parsed.totalChunks; idx++) {
        const b64 = partMap.get(`cloud_file_${cleanId}_part_${idx}`);
        if (b64) {
          buffers.push(Buffer.from(b64, "base64"));
        }
      }
      fullBuffer = Buffer.concat(buffers);
    } else {
      fullBuffer = Buffer.from(parsed.base64 || "", "base64");
    }

    const totalLength = fullBuffer.length;
    const rangeHeader = req.headers.get("range");

    const commonCacheHeaders = {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Accept-Ranges": "bytes",
      // Cache en navegador Y en el Edge CDN de Vercel por 1 año para no consumir transferencia de base de datos
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "CDN-Cache-Control": "public, max-age=31536000, immutable",
      "Vercel-CDN-Cache-Control": "public, max-age=31536000, immutable"
    };

    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

      if (!isNaN(start) && !isNaN(end) && start >= 0 && end < totalLength && start <= end) {
        const chunk = fullBuffer.subarray(start, end + 1);
        return new NextResponse(chunk, {
          status: 206,
          headers: {
            ...commonCacheHeaders,
            "Content-Range": `bytes ${start}-${end}/${totalLength}`,
            "Content-Length": String(chunk.length)
          }
        });
      }
    }

    return new NextResponse(fullBuffer, {
      status: 200,
      headers: {
        ...commonCacheHeaders,
        "Content-Length": String(totalLength)
      }
    });
  } catch (err) {
    console.error("Error sirviendo archivo /api/files/[fileId]:", err);
    return new NextResponse("Error al leer el archivo", { status: 500 });
  }
}
