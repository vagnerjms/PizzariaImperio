import crypto from "node:crypto";
import { Binary } from "mongodb";
import { getCollection } from "./db";

export interface MediaDoc {
  _id: string;
  mime_type: string;
  data: Binary;
  size: number;
  created_at: Date;
}

const ALLOWED_MIME_TYPES = new Set(["image/webp", "image/jpeg", "image/png", "image/gif"]);

const MAX_MEDIA_BYTES = 2 * 1024 * 1024; // 2 MB

function matchesImageMagicBytes(buf: Buffer, mimeType: string): boolean {
  if (buf.length < 12) return false;
  switch (mimeType) {
    case "image/jpeg":
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case "image/png":
      return (
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a
      );
    case "image/webp":
      return (
        buf.subarray(0, 4).toString("ascii") === "RIFF" &&
        buf.subarray(8, 12).toString("ascii") === "WEBP"
      );
    case "image/gif": {
      const hdr = buf.subarray(0, 6).toString("ascii");
      return hdr === "GIF87a" || hdr === "GIF89a";
    }
    default:
      return false;
  }
}

export function parseAndValidateImageDataUrl(dataUrl: string): {
  mimeType: string;
  buffer: Buffer;
} {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(
    (dataUrl || "").trim(),
  );
  if (!match) {
    throw new Error("Formato de imagem inválido. Envie JPG, PNG, WebP ou GIF.");
  }

  const mimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Tipo de imagem não permitido. Use JPG, PNG, WebP ou GIF.");
  }

  const base64Clean = match[2].replace(/\s+/g, "");
  const buffer = Buffer.from(base64Clean, "base64");

  if (buffer.length === 0) {
    throw new Error("Arquivo de imagem vazio.");
  }
  if (buffer.length > MAX_MEDIA_BYTES) {
    throw new Error("Imagem muito grande. O limite máximo é de 2 MB.");
  }
  if (!matchesImageMagicBytes(buffer, mimeType)) {
    throw new Error("Conteúdo do arquivo não corresponde a uma imagem válida.");
  }

  return { mimeType, buffer };
}

export async function saveMediaImageInDb(dataUrl: string): Promise<{ id: string; url: string }> {
  const { mimeType, buffer } = parseAndValidateImageDataUrl(dataUrl);
  const id = crypto.randomUUID();
  const col = await getCollection<MediaDoc>("media");

  await col.insertOne({
    _id: id,
    mime_type: mimeType,
    data: new Binary(buffer),
    size: buffer.length,
    created_at: new Date(),
  });

  return { id, url: `/api/media/${id}` };
}

export async function getMediaImageFromDb(
  id: string,
): Promise<{ mimeType: string; bytes: Uint8Array } | null> {
  if (!/^[a-f0-9-]{8,64}$/i.test(id || "")) {
    return null;
  }

  const col = await getCollection<MediaDoc>("media");
  const doc = await col.findOne({ _id: id });
  if (!doc || !doc.data || !ALLOWED_MIME_TYPES.has(doc.mime_type)) {
    return null;
  }

  const raw = doc.data.buffer;
  const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  return { mimeType: doc.mime_type, bytes };
}
