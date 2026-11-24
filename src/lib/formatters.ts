/**
 * Formatadores e helpers de texto/dados para todo o ecossistema Pizzaria Império.
 */

/**
 * Formata um valor numérico em moeda brasileira (BRL).
 */
export function formatBRL(value: number): string {
  return (value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Normaliza e limpa strings removendo acentos e caracteres especiais para comparação flexível.
 */
export function cleanString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * Aplica máscara de telefone brasileiro (DDD) 9 0000-0000.
 */
export function formatPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Formata datas no formato padrão brasileiro DD/MM/AAAA.
 */
export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return dateStr;
  }
}

export const PIZZA_CATEGORIES = new Set<string>([
  "tradicionais",
  "especiais",
  "doces",
  "doces-especiais",
]);

/**
 * Indica se a categoria corresponde a uma pizza de 8 fatias (elegível a borda e meio a meio).
 */
export function isPizzaCategory(category: string | null | undefined): boolean {
  return Boolean(category && PIZZA_CATEGORIES.has(category));
}

/**
 * Remove caracteres de controle ASCII (0x00-0x1F, 0x7F) sem usar regex de controle,
 * aplica limite máximo opcional e faz trim.
 */
export function sanitizeText(str: string, max?: number): string {
  if (!str) return "";
  let cleaned = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 32 && code !== 127) {
      cleaned += str[i];
    }
  }
  const sliced = typeof max === "number" ? cleaned.slice(0, max) : cleaned;
  return sliced.trim();
}
