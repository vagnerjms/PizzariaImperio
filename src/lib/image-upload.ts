/**
 * Comprime e redimensiona uma imagem selecionada pelo usuário no navegador
 * antes do envio ao servidor (gera WebP/JPEG leve para carregamento rápido).
 */

const MAX_INPUT_FILE_BYTES = 15 * 1024 * 1024; // 15 MB bruto antes da compressão
const MAX_FALLBACK_RAW_BYTES = 1.8 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Não foi possível ler o arquivo de imagem."));
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo selecionado."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Arquivo não pôde ser decodificado como imagem."));
    img.src = src;
  });
}

export async function compressImageFileToDataUrl(
  file: File,
  maxWidth = 900,
  maxHeight = 675,
  quality = 0.84,
): Promise<string> {
  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem (JPG, PNG ou WebP).");
  }
  if (file.type === "image/svg+xml") {
    throw new Error("Formato SVG não é suportado. Use JPG, PNG ou WebP.");
  }
  if (file.size > MAX_INPUT_FILE_BYTES) {
    throw new Error("Arquivo muito grande (máx. 15 MB).");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(
      1,
      maxWidth / (img.naturalWidth || 1),
      maxHeight / (img.naturalHeight || 1),
    );
    const width = Math.max(1, Math.round((img.naturalWidth || maxWidth) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || maxHeight) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      if (file.size <= MAX_FALLBACK_RAW_BYTES) return readFileAsDataUrl(file);
      throw new Error("Seu navegador não suporta compressão de imagem.");
    }

    ctx.drawImage(img, 0, 0, width, height);

    const webp = canvas.toDataURL("image/webp", quality);
    if (webp.startsWith("data:image/webp;base64,")) {
      return webp;
    }
    return canvas.toDataURL("image/jpeg", quality);
  } catch (err) {
    if (file.size <= MAX_FALLBACK_RAW_BYTES && file.type !== "image/svg+xml") {
      return readFileAsDataUrl(file);
    }
    throw err instanceof Error ? err : new Error("Falha ao processar a imagem.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
