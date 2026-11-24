import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { parseAndValidateImageDataUrl } from "@/lib/media.server";
import { normalizeImageForStorage, resolveMenuImage } from "@/lib/menu-domain";

// Minimal 1x1 PNG bytes (valid PNG header + IHDR + IEND)
const VALID_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("Product Image Upload Validation & Routing", () => {
  test("parseAndValidateImageDataUrl aceita PNG válido e retorna buffer binário", () => {
    const res = parseAndValidateImageDataUrl(`data:image/png;base64,${VALID_PNG_BASE64}`);
    assert.equal(res.mimeType, "image/png");
    assert.ok(res.buffer.length > 20);
  });

  test("parseAndValidateImageDataUrl bloqueia SVG (XSS) e magic bytes falsificados", () => {
    const svgBase64 = Buffer.from("<svg onload=alert(1)></svg>").toString("base64");
    assert.throws(
      () => parseAndValidateImageDataUrl(`data:image/svg+xml;base64,${svgBase64}`),
      /não permitido/i,
    );

    const fakePng = Buffer.from("NOT A REAL PNG FILE CONTENT").toString("base64");
    assert.throws(
      () => parseAndValidateImageDataUrl(`data:image/png;base64,${fakePng}`),
      /não corresponde/i,
    );
  });

  test("menu-domain preserva URLs /api/media/* intactas na gravação e resolução", () => {
    const uploadedUrl = "/api/media/550e8400-e29b-41d4-a716-446655440000";
    assert.equal(normalizeImageForStorage(uploadedUrl), uploadedUrl);
    assert.equal(resolveMenuImage(uploadedUrl, "calabresa"), uploadedUrl);
  });
});
