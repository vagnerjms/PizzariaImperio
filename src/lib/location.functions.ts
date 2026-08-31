import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "./db";
import { cleanString } from "./delivery-config";

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
 * 1. Geocodificação Reversa via GPS com Fallback (Nominatim + Photon OSM)
 */
export const reverseGeocodeGPS = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      lat: z.number(),
      lon: z.number(),
    }).parse(raw)
  )
  .handler(async ({ data }): Promise<LocationResult | null> => {
    // 1. Tentativa Primária: Nominatim OpenStreetMap
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${data.lat}&lon=${data.lon}&format=json&addressdetails=1`;
      const res = await fetch(url, {
        headers: NOMINATIM_HEADERS,
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.address) {
          const addr = json.address;
          const rua = addr.road || addr.street || addr.pedestrian || addr.footway || addr.suburb || "";
          const numero = addr.house_number || "";
          const bairro = addr.suburb || addr.neighbourhood || addr.residential || addr.city_district || addr.quarter || "";
          const cidade = addr.city || addr.town || addr.municipality || addr.village || "Bragança Paulista";
          const uf = addr.state_code || (addr.state === "São Paulo" ? "SP" : addr.state) || "SP";
          const rawCep = (addr.postcode || "").replace(/\D/g, "");
          const formattedCep = rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}` : (rawCep || "12900-000");

          if (rua || bairro) {
            return {
              rua,
              numero,
              bairro,
              cidade,
              uf,
              cep: formattedCep,
              formattedAddress: json.display_name || `${rua}, ${bairro} - ${cidade}`,
            };
          }
        }
      }
    } catch (err) {
      console.warn("[reverseGeocodeGPS Nominatim Warning]:", err);
    }

    // 2. Fallback Secundário: Photon Komoot Reverse
    try {
      const photonUrl = `https://photon.komoot.io/reverse?lat=${data.lat}&lon=${data.lon}`;
      const res = await fetch(photonUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const json = await res.json();
        const feature = json?.features?.[0];
        if (feature && feature.properties) {
          const props = feature.properties;
          const rua = props.street || props.name || "";
          const numero = props.housenumber || "";
          const bairro = props.district || props.locality || props.suburb || "";
          const cidade = props.city || "Bragança Paulista";
          const uf = props.state || "SP";
          const rawCep = (props.postcode || "").replace(/\D/g, "");
          const formattedCep = rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}` : "12900-000";

          return {
            rua,
            numero,
            bairro,
            cidade,
            uf,
            cep: formattedCep,
            formattedAddress: `${rua}, ${bairro} - ${cidade}`,
          };
        }
      }
    } catch (err) {
      console.warn("[reverseGeocodeGPS Photon Warning]:", err);
    }

    return null;
  });

/**
 * 2. Motor de Busca de Ruas com Multi-Tier Fallback
 * (ViaCEP + Photon OSM + Nominatim + Catálogo de Bairros de Bragança no MongoDB)
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

    const addResult = (item: LocationResult) => {
      const key = `${cleanString(item.rua)}-${cleanString(item.bairro)}`.toLowerCase();
      if (!seen.has(key) && (item.rua || item.bairro)) {
        seen.add(key);
        results.push(item);
      }
    };

    // =========================================================================
    // TIER 1: ViaCEP Oficial de Ruas de Bragança Paulista - SP
    // =========================================================================
    try {
      const viacepUrl = `https://viacep.com.br/ws/SP/Braganca%20Paulista/${encodeURIComponent(cleanQuery)}/json/`;
      const res = await fetch(viacepUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const item of list.slice(0, 8)) {
            if (item.logradouro) {
              addResult({
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

    // =========================================================================
    // TIER 2: Photon Komoot OpenStreetMap (Fuzzy Search com tolerância a digitação)
    // =========================================================================
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery + " Bragança Paulista")}&lat=-22.952&lon=-46.542&limit=8`;
      const res = await fetch(photonUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.features)) {
          for (const feature of json.features) {
            const props = feature.properties || {};
            const rua = props.street || props.name || "";
            const bairro = props.district || props.locality || props.suburb || "Bragança Paulista";
            const cidade = props.city || "Bragança Paulista";
            if (rua && (cidade.toLowerCase().includes("bragan") || props.state?.includes("SP"))) {
              const rawCep = (props.postcode || "").replace(/\D/g, "");
              const formattedCep = rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}` : "12900-000";
              addResult({
                rua,
                numero: props.housenumber || "",
                bairro,
                cidade: "Bragança Paulista",
                uf: "SP",
                cep: formattedCep,
                formattedAddress: `${rua}, ${bairro} - Bragança Paulista, SP`,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn("[Photon Street Search Warning]:", err);
    }

    // =========================================================================
    // TIER 3: Nominatim OpenStreetMap (Busca Estruturada)
    // =========================================================================
    if (results.length < 3) {
      try {
        const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery + ", Bragança Paulista, SP, Brasil")}&format=json&addressdetails=1&limit=8&countrycodes=br`;
        const res = await fetch(osmUrl, {
          headers: NOMINATIM_HEADERS,
          signal: AbortSignal.timeout(3500),
        });

        if (res.ok) {
          const osmList = await res.json();
          if (Array.isArray(osmList)) {
            for (const item of osmList) {
              const addr = item.address || {};
              const rua = addr.road || addr.street || addr.pedestrian || item.name || "";
              const bairro = addr.suburb || addr.neighbourhood || addr.residential || addr.city_district || "Bragança Paulista";
              const rawCep = (addr.postcode || "").replace(/\D/g, "");
              const formattedCep = rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}` : "12900-000";

              if (rua) {
                addResult({
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
        console.warn("[Nominatim Street Search Warning]:", err);
      }
    }

    // =========================================================================
    // TIER 4: Catálogo de 90+ Bairros de Bragança Paulista no MongoDB
    // (Garante que qualquer busca por nome de bairro encontre a taxa correta)
    // =========================================================================
    try {
      const db = await getDb();
      const settingsDoc = await db.collection("delivery_settings").findOne({ _id: "default_config" as any });
      const neighborhoods: Array<{ name: string; fee: number }> = settingsDoc?.neighborhoods || [];

      const queryClean = cleanString(cleanQuery);
      const matchedNeighborhoods = neighborhoods.filter((n) => {
        const nClean = cleanString(n.name);
        return nClean.includes(queryClean) || queryClean.includes(nClean);
      });

      for (const n of matchedNeighborhoods.slice(0, 4)) {
        addResult({
          rua: `Bairro ${n.name}`,
          numero: "",
          bairro: n.name,
          cidade: "Bragança Paulista",
          uf: "SP",
          cep: "12900-000",
          formattedAddress: `Bairro ${n.name} - Bragança Paulista, SP (Taxa de Entrega: R$ ${n.fee.toFixed(2).replace('.', ',')})`,
        });
      }
    } catch (err) {
      console.warn("[MongoDB Neighborhood Catalog Search Warning]:", err);
    }

    return results;
  });
