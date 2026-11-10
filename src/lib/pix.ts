/**
 * Módulo de geração de Payload Pix Estático (EMVCo QRCPS-MPM / Banco Central do Brasil).
 */

/**
 * Formata um campo no padrão TLV (Tag-Length-Value) do padrão EMVCo.
 */
function formatField(id: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

/**
 * Calcula o checksum CRC-16 (polinômio 0x1021) conforme exigido pela especificação do Pix do BCB.
 */
function calculateCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    const byte = payload.charCodeAt(i);
    crc ^= byte << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Gera o payload "Copia e Cola" do Pix Estático.
 */
export function generateStaticPix(
  key: string,
  name: string,
  city: string,
  amount: number,
  txid = "PIZZARIA"
): string {
  const cleanKey = key.trim();
  const cleanName = name.slice(0, 25).trim();
  const cleanCity = city.slice(0, 15).trim();

  const merchantAccountInfo =
    formatField("00", "br.gov.bcb.pix") +
    formatField("01", cleanKey);

  const payload = [
    formatField("00", "01"),
    formatField("26", merchantAccountInfo),
    formatField("52", "0000"),
    formatField("53", "986"),
    formatField("54", amount.toFixed(2)),
    formatField("58", "BR"),
    formatField("59", cleanName),
    formatField("60", cleanCity),
    formatField("62", formatField("05", txid)),
    "6304",
  ].join("");

  return payload + calculateCrc16(payload);
}

