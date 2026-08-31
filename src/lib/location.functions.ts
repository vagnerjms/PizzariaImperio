import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface LocationResult {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  formattedAddress: string;
}

const NOMINATIM_HEADERS = {
  "Accept": "application/json",
  "User-Agent": "PizzariaImperioApp/2.0 (contato@embraganca.com.br)",
};

/**
 * 1. Geocodificação Reversa via GPS (Executado no Servidor sem restrições de CORS)
 */
export const reverseGeocodeGPS = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      lat: z.number(),
      lon: z.number(),
    }).parse(raw)
  )
  .handler(async ({ data }): Promise<LocationResult | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${data.lat}&lon=${data.lon}&format=json&addressdetails=1`;
      const res = await fetch(url, {
        headers: NOMINATIM_HEADERS,
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        console.error(`[Nominatim Reverse] Failed with status ${res.status}`);
        return null;
      }

      const json = await res.json();
      if (!json || !json.address) return null;

      const addr = json.address;
      const rua = addr.road || addr.street || addr.pedestrian || addr.footway || addr.suburb || "";
      const numero = addr.house_number || "";
      const bairro = addr.suburb || addr.neighbourhood || addr.residential || addr.city_district || addr.quarter || "";
      const cidade = addr.city || addr.town || addr.municipality || addr.village || "Bragança Paulista";
      const uf = addr.state_code || (addr.state === "São Paulo" ? "SP" : addr.state) || "SP";
      const rawCep = (addr.postcode || "").replace(/\D/g, "");
      const formattedCep = rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}` : (rawCep || "12900-000");

      return {
        rua,
        numero,
        bairro,
        cidade,
        uf,
        cep: formattedCep,
        formattedAddress: json.display_name || `${rua}, ${bairro} - ${cidade}`,
      };
    } catch (err) {
      console.error("[reverseGeocodeGPS Error]:", err);
      return null;
    }
  });

/**
 * 2. Busca Híbrida de Ruas (ViaCEP Oficial de Bragança Paulista + Fallback Nominatim OSM)
 */
export const searchStreetAddress = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      query: z.string().trim().min(2),
    }).parse(raw)
  )
  .handler(async ({ data }): Promise<LocationResult[]> => {
    const cleanQuery = data.query.trim();
    const results: LocationResult[] = [];
    const seen = new Set<string>();

    // A. Busca Primária Oficial dos Correios / ViaCEP para Bragança Paulista - SP
    try {
      const viacepUrl = `https://viacep.com.br/ws/SP/Braganca%20Paulista/${encodeURIComponent(cleanQuery)}/json/`;
      const res = await fetch(viacepUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const item of list.slice(0, 8)) {
            const key = `${item.logradouro}-${item.bairro}`.toLowerCase();
            if (!seen.has(key) && item.logradouro) {
              seen.add(key);
              results.push({
                rua: item.logradouro,
                numero: "",
                bairro: item.bairro || "Centro",
                cidade: "Bragança Paulista",
                uf: "SP",
                cep: item.cep || "12900-000",
                formattedAddress: `${item.logradouro}, ${item.bairro} - Bragança Paulista, SP`,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn("[ViaCEP Street Search Warning]:", err);
    }

    // B. Se ViaCEP encontrou resultados suficientes, retorna
    if (results.length >= 3) {
      return results;
    }

    // C. Fallback: Busca no Nominatim OpenStreetMap no Servidor
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(cleanQuery)}&city=Braganca+Paulista&state=SP&country=Brazil&format=json&addressdetails=1&limit=8`;
      const res = await fetch(osmUrl, {
        headers: NOMINATIM_HEADERS,
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const osmList = await res.json();
        if (Array.isArray(osmList)) {
          for (const item of osmList) {
            const addr = item.address || {};
            const rua = addr.road || addr.street || addr.pedestrian || item.name || "";
            const bairro = addr.suburb || addr.neighbourhood || addr.residential || "Bragança Paulista";
            const key = `${rua}-${bairro}`.toLowerCase();

            if (rua && !seen.has(key)) {
              seen.add(key);
              const rawCep = (addr.postcode || "").replace(/\D/g, "");
              const formattedCep = rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}` : "12900-000";

              results.push({
                rua,
                numero: addr.house_number || "",
                bairro,
                cidade: "Bragança Paulista",
                uf: "SP",
                cep: formattedCep,
                formattedAddress: item.display_name,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("[Nominatim Street Search Fallback Error]:", err);
    }

    return results;
  });
