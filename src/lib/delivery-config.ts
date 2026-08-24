export interface NeighborhoodFeeItem {
  id?: string;
  name: string;
  fee: number;
}

export function cleanString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

export function matchDeliveryFee(
  neighborhood: string,
  neighborhoods?: NeighborhoodFeeItem[],
  defaultFee = 7.00
): number {
  if (!neighborhood) return defaultFee;
  const cleanTarget = cleanString(neighborhood);

  if (neighborhoods && neighborhoods.length > 0) {
    const exact = neighborhoods.find(n => cleanString(n.name) === cleanTarget);
    if (exact) return exact.fee;

    const partial = neighborhoods.find(n => {
      const cleanName = cleanString(n.name);
      return cleanTarget.includes(cleanName) || cleanName.includes(cleanTarget);
    });
    if (partial) return partial.fee;

    return defaultFee;
  }

  return defaultFee;
}

export function getDeliveryFeeForNeighborhood(
  neighborhood: string,
  neighborhoods?: NeighborhoodFeeItem[],
  defaultFee = 7.00
): number {
  return matchDeliveryFee(neighborhood, neighborhoods, defaultFee);
}
