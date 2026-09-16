import { useState, useRef, useCallback, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getDeliveryFeeForNeighborhood, cleanString } from "@/lib/delivery-config";
import { getPublicDeliveryConfig } from "@/lib/delivery.functions";
import { reverseGeocodeGPS, searchStreetAddress, LocationResult } from "@/lib/location.functions";

export interface DeliveryAddressForm {
  name: string;
  phone: string;
  cep: string;
  rua: string;
  bairro: string;
  numero: string;
  complemento: string;
  cidadeUf: string;
  deliveryFee: number | null;
  payment: "" | "Pix" | "Dinheiro" | "Cartão de crédito" | "Cartão de débito";
  troco: string;
  notes: string;
}

const initialForm: DeliveryAddressForm = {
  name: "",
  phone: "",
  cep: "",
  rua: "",
  bairro: "",
  numero: "",
  complemento: "",
  cidadeUf: "Bragança Paulista - SP",
  deliveryFee: null,
  payment: "",
  troco: "",
  notes: "",
};

export function useDeliveryAddress() {
  const [form, setForm] = useState<DeliveryAddressForm>(initialForm);
  const [cepLoading, setCepLoading] = useState(false);
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [streetSearching, setStreetSearching] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState<LocationResult[]>([]);
  const [bairroSuggestions, setBairroSuggestions] = useState<Array<{ name: string; fee: number }>>([]);
  const [locationMsg, setLocationMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deliveryConfig, setDeliveryConfig] = useState<{ default_fee: number; neighborhoods: any[] } | null>(null);

  const fetchDeliveryConfig = useServerFn(getPublicDeliveryConfig);
  const fetchGpsAddress = useServerFn(reverseGeocodeGPS);
  const fetchStreetSearch = useServerFn(searchStreetAddress);

  useEffect(() => {
    fetchDeliveryConfig()
      .then((cfg) => {
        if (cfg) setDeliveryConfig(cfg);
      })
      .catch((err) => console.error("Erro ao carregar taxas de entrega:", err));
  }, []);

  const sanitize = (s: string, max: number) =>
    s.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max).trim();

  const handleCEPLookup = async (cepValue: string) => {
    const cleanCEP = cepValue.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;

    setCepLoading(true);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.cep;
      return copy;
    });

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`, {
        signal: AbortSignal.timeout(2500),
      });
      if (!res.ok) throw new Error("Erro na busca de CEP");
      const data = await res.json();
      
      if (data.erro) {
        setErrors((prev) => ({ ...prev, cep: "CEP não encontrado." }));
        return;
      }

      const fee = getDeliveryFeeForNeighborhood(data.bairro, deliveryConfig?.neighborhoods, deliveryConfig?.default_fee);

      setForm((prev) => ({
        ...prev,
        rua: data.logradouro || "",
        bairro: data.bairro || "",
        cidadeUf: `${data.localidade} - ${data.uf}`,
        deliveryFee: fee,
      }));
    } catch {
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCEP}`, {
          signal: AbortSignal.timeout(2500),
        });
        if (!res.ok) throw new Error("Erro na busca de CEP");
        const data = await res.json();

        const fee = getDeliveryFeeForNeighborhood(data.neighborhood, deliveryConfig?.neighborhoods, deliveryConfig?.default_fee);

        setForm((prev) => ({
          ...prev,
          rua: data.street || "",
          bairro: data.neighborhood || "",
          cidadeUf: `${data.city} - ${data.state}`,
          deliveryFee: fee,
        }));
      } catch {
        try {
          const res = await fetch(`https://cep.awesomeapi.com.br/json/${cleanCEP}`, {
            signal: AbortSignal.timeout(2500),
          });
          if (!res.ok) throw new Error("Erro na busca de CEP");
          const data = await res.json();
          const fee = getDeliveryFeeForNeighborhood(data.district || data.neighborhood, deliveryConfig?.neighborhoods, deliveryConfig?.default_fee);

          setForm((prev) => ({
            ...prev,
            rua: data.address || "",
            bairro: data.district || data.neighborhood || "",
            cidadeUf: `${data.city} - ${data.state}`,
            deliveryFee: fee,
          }));
        } catch {
          setErrors((prev) => ({ ...prev, cep: "CEP não localizado nas bases públicas. Digite sua rua abaixo." }));
        }
      }
    } finally {
      setCepLoading(false);
    }
  };

  const handleCEPChange = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    let formatted = numeric;
    if (numeric.length > 5) {
      formatted = `${numeric.slice(0, 5)}-${numeric.slice(5, 8)}`;
    }
    
    setForm((f) => ({ ...f, cep: formatted.slice(0, 9) }));
    if (errors.cep) setErrors((e) => ({ ...e, cep: "" }));

    if (numeric.length === 8) {
      handleCEPLookup(numeric);
    }
  };

  const handleGPSLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setErrors((prev) => ({ ...prev, cep: "Geolocalização não suportada no seu navegador." }));
      return;
    }

    setLocatingGPS(true);
    setLocationMsg("Obtendo sua localização via GPS...");
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.cep;
      delete copy.rua;
      delete copy.bairro;
      return copy;
    });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const loc = await fetchGpsAddress({ data: { lat: latitude, lon: longitude } });
          if (!loc) {
            setLocationMsg(null);
            setErrors((prev) => ({ ...prev, cep: "Não foi possível identificar o endereço pelo GPS. Digite o CEP ou o nome da rua." }));
            return;
          }

          const fee = getDeliveryFeeForNeighborhood(loc.bairro, deliveryConfig?.neighborhoods, deliveryConfig?.default_fee);

          setForm((prev) => ({
            ...prev,
            rua: loc.rua || prev.rua,
            numero: loc.numero || prev.numero,
            bairro: loc.bairro || prev.bairro,
            cidadeUf: `${loc.cidade} - ${loc.uf}`,
            cep: loc.cep || prev.cep || "12900-000",
            deliveryFee: fee,
          }));
          setLocationMsg(`📍 Localizado: ${loc.rua ? loc.rua + ', ' : ''}${loc.bairro || loc.cidade}`);
          setTimeout(() => setLocationMsg(null), 5000);
        } catch (e) {
          console.error("GPS Reverse Error:", e);
          setErrors((prev) => ({ ...prev, cep: "Erro ao consultar o serviço de GPS." }));
        } finally {
          setLocatingGPS(false);
        }
      },
      (error) => {
        setLocatingGPS(false);
        setLocationMsg(null);
        if (error.code === error.PERMISSION_DENIED) {
          setErrors((prev) => ({ ...prev, cep: "Permissão de localização negada. Digite seu CEP ou o nome da rua." }));
        } else {
          setErrors((prev) => ({ ...prev, cep: "Não foi possível obter a posição do GPS." }));
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const searchTimeoutRef = useRef<any>(null);

  const handleRuaInputChange = (val: string) => {
    setForm((f) => ({ ...f, rua: val }));
    if (errors.rua) setErrors((e) => ({ ...e, rua: "" }));

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length < 3) {
      setStreetSuggestions([]);
      setStreetSearching(false);
      return;
    }

    setStreetSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await fetchStreetSearch({ data: { query: val.trim() } });
        setStreetSuggestions(results || []);
      } catch (e) {
        console.error("Erro na busca de rua:", e);
      } finally {
        setStreetSearching(false);
      }
    }, 550);
  };

  const handleSelectSuggestion = (loc: LocationResult) => {
    const fee = getDeliveryFeeForNeighborhood(loc.bairro, deliveryConfig?.neighborhoods, deliveryConfig?.default_fee);

    setForm((prev) => ({
      ...prev,
      rua: loc.rua,
      numero: loc.numero || prev.numero,
      bairro: loc.bairro,
      cidadeUf: `${loc.cidade} - ${loc.uf}`,
      cep: loc.cep || prev.cep || "12900-000",
      deliveryFee: fee,
    }));

    setStreetSuggestions([]);
    setLocationMsg(`📍 Endereço preenchido: ${loc.rua} (${loc.bairro})`);
    setTimeout(() => setLocationMsg(null), 5000);
  };

  const handleBairroInputChange = (val: string) => {
    const fee = getDeliveryFeeForNeighborhood(val, deliveryConfig?.neighborhoods, deliveryConfig?.default_fee);
    setForm((f) => ({ ...f, bairro: val, deliveryFee: fee }));
    if (errors.bairro) setErrors((e) => ({ ...e, bairro: "" }));

    if (val.trim().length >= 2 && deliveryConfig?.neighborhoods) {
      const cleanVal = cleanString(val);
      const matches = deliveryConfig.neighborhoods.filter((n: any) =>
        cleanString(n.name).includes(cleanVal)
      );
      setBairroSuggestions(matches.slice(0, 6));
    } else {
      setBairroSuggestions([]);
    }
  };

  const handleSelectBairro = (n: { name: string; fee: number }) => {
    setForm((f) => ({ ...f, bairro: n.name, deliveryFee: n.fee }));
    setBairroSuggestions([]);
    setLocationMsg(`📍 Bairro selecionado: ${n.name} (Taxa: R$ ${n.fee.toFixed(2).replace('.', ',')})`);
    setTimeout(() => setLocationMsg(null), 4000);
  };

  const setField = (k: keyof DeliveryAddressForm) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = useCallback((totalAmount: number) => {
    const e: Record<string, string> = {};
    const name = sanitize(form.name, 80);
    const phone = sanitize(form.phone, 20);
    const cep = form.cep.replace(/\D/g, "");
    
    if (name.length < 2) e.name = "Informe seu nome completo.";
    if (phone.replace(/\D/g, "").length < 10) e.phone = "Telefone inválido (com DDD).";
    if (cep.length !== 8 && (!form.rua.trim() || !form.bairro.trim())) e.cep = "Informe seu CEP ou use o GPS/Busca por rua.";
    if (!form.rua.trim()) e.rua = "Informe a rua.";
    if (!form.numero.trim()) e.numero = "Informe o número.";
    if (!form.bairro.trim()) e.bairro = "Informe o bairro.";
    if (!form.payment) e.payment = "Selecione a forma de pagamento.";
    
    if (form.payment === "Dinheiro" && form.troco) {
      const trocoVal = Number(form.troco.replace(",", "."));
      if (isNaN(trocoVal) || trocoVal < totalAmount) {
        e.troco = `O troco deve ser maior que o total do pedido (R$ ${totalAmount.toFixed(2).replace('.', ',')}).`;
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const resetForm = useCallback(() => {
    setForm(initialForm);
    setErrors({});
    setLocationMsg(null);
  }, []);

  return {
    form,
    errors,
    cepLoading,
    locatingGPS,
    streetSearching,
    streetSuggestions,
    bairroSuggestions,
    locationMsg,
    handleCEPChange,
    handleGPSLocation,
    handleRuaInputChange,
    handleSelectSuggestion,
    handleBairroInputChange,
    handleSelectBairro,
    setField,
    validate,
    resetForm,
    sanitize,
  };
}
