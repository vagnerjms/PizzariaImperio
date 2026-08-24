export const DELIVERY_FEES: Record<string, number> = {
  "centro": 5.00,
  "vila mariana": 6.00,
  "pinheiros": 7.00,
  "jardins": 8.00,
  "itaim bibi": 8.00,
  "moema": 7.00,
  "brooklin": 8.00,
  "morumbi": 10.00,
  "lapa": 9.00,
  "santana": 8.00,
  "saude": 6.00,
  "ipiranga": 6.00,
  "butanta": 9.00,
  "perdizes": 7.00,
};

export const DEFAULT_DELIVERY_FEE = 7.00;

export function cleanString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

export function getDeliveryFeeForNeighborhood(neighborhood: string): number {
  if (!neighborhood) return DEFAULT_DELIVERY_FEE;
  const cleanName = cleanString(neighborhood);
  
  // Tenta encontrar correspondência exata
  if (DELIVERY_FEES[cleanName] !== undefined) {
    return DELIVERY_FEES[cleanName];
  }
  
  // Tenta encontrar correspondência parcial (ex: "Jardim Paulista" match "jardins" ou similar)
  for (const [key, val] of Object.entries(DELIVERY_FEES)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return val;
    }
  }
  
  return DEFAULT_DELIVERY_FEE;
}
