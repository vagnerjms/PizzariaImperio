import { useState, useRef, useCallback, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDeliveryFeeForNeighborhood } from "@/lib/delivery-config";
import { cleanString, formatPhoneMask, sanitizeText } from "@/lib/formatters";
import { lookupAddressByCep } from "@/lib/cep-client";
import { queryKeys } from "@/lib/query-keys";
import { useCustomerProfile } from "./useCustomerProfile";
export { formatPhoneMask };
import { getPublicDeliveryConfig } from "@/lib/delivery.functions";
import { reverseGeocodeGPS, searchStreetAddress, LocationResult } from "@/lib/location.functions";

export type DeliveryMode = "delivery" | "pickup" | "dine_in" | "";

export interface DeliveryAddressForm {
  name: string;
  phone: string;
  deliveryMode: DeliveryMode;
  tableNumber: string;
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
  deliveryMode: "",
  tableNumber: "",
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

export function useDeliveryAddress(options?: { enabled?: boolean }) {
  const deliveryQueryEnabled = options?.enabled ?? true;
  const { profile, hasSavedIdentity, hasSavedAddress, saveProfile } = useCustomerProfile();
  const [form, setForm] = useState<DeliveryAddressForm>(initialForm);
  const [cepLoading, setCepLoading] = useState(false);
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [streetSearching, setStreetSearching] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState<LocationResult[]>([]);
  const [bairroSuggestions, setBairroSuggestions] = useState<Array<{ name: string; fee: number }>>(
    [],
  );
  const [locationMsg, setLocationMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchDeliveryConfig = useServerFn(getPublicDeliveryConfig);
  const fetchGpsAddress = useServerFn(reverseGeocodeGPS);
  const fetchStreetSearch = useServerFn(searchStreetAddress);

  const { data: deliveryConfig = null } = useQuery<{
    default_fee: number;
    neighborhoods: any[];
  } | null>({
    queryKey: queryKeys.public.deliveryConfig(),
    queryFn: async () => (await fetchDeliveryConfig()) || null,
    enabled: deliveryQueryEnabled,
    staleTime: 5 * 60 * 1000,
  });

  // Hidrata dados do perfil do cliente quando carregado do storage
  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        name: profile.name || prev.name,
        phone: profile.phone || prev.phone,
        cep: profile.cep || prev.cep,
        rua: profile.rua || prev.rua,
        numero: profile.numero || prev.numero,
        bairro: profile.bairro || prev.bairro,
        complemento: profile.complemento || prev.complemento,
        cidadeUf: profile.cidadeUf || prev.cidadeUf,
        deliveryMode:
          profile.rua && profile.numero && profile.bairro ? "delivery" : prev.deliveryMode,
      }));
    }
  }, [profile]);

  // Recalcula taxa sempre que a tabela de bairros, o bairro ou a modalidade mudar (elimina race condition de hidratação)
  useEffect(() => {
    if (!deliveryConfig) return;
    setForm((prev) => {
      if (prev.deliveryMode === "pickup" || prev.deliveryMode === "dine_in") {
        return prev.deliveryFee === 0 ? prev : { ...prev, deliveryFee: 0 };
      }
      if (prev.bairro) {
        const fee = getDeliveryFeeForNeighborhood(
          prev.bairro,
          deliveryConfig.neighborhoods,
          deliveryConfig.default_fee,
        );
        return prev.deliveryFee === fee ? prev : { ...prev, deliveryFee: fee };
      }
      return prev;
    });
  }, [deliveryConfig, form.bairro, form.deliveryMode]);

  const persistCustomerProfile = useCallback(
    (nextForm: DeliveryAddressForm) => {
      saveProfile(nextForm);
    },
    [saveProfile],
  );

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
      const result = await lookupAddressByCep(cleanCEP);
      if (!result) {
        setErrors((prev) => ({
          ...prev,
          cep: "CEP não localizado nas bases públicas. Digite sua rua abaixo.",
        }));
        return;
      }

      const fee = getDeliveryFeeForNeighborhood(
        result.bairro,
        deliveryConfig?.neighborhoods,
        deliveryConfig?.default_fee,
      );

      setForm((prev) => ({
        ...prev,
        rua: result.rua,
        bairro: result.bairro,
        cidadeUf: result.cidadeUf,
        deliveryFee: prev.deliveryMode === "pickup" || prev.deliveryMode === "dine_in" ? 0 : fee,
      }));
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
            setErrors((prev) => ({
              ...prev,
              cep: "Não foi possível identificar o endereço pelo GPS. Digite o CEP ou o nome da rua.",
            }));
            return;
          }

          const fee = getDeliveryFeeForNeighborhood(
            loc.bairro,
            deliveryConfig?.neighborhoods,
            deliveryConfig?.default_fee,
          );

          setForm((prev) => ({
            ...prev,
            rua: loc.rua || prev.rua,
            numero: loc.numero || prev.numero,
            bairro: loc.bairro || prev.bairro,
            cidadeUf: `${loc.cidade} - ${loc.uf}`,
            cep: loc.cep || prev.cep || "12900-000",
            deliveryFee:
              prev.deliveryMode === "pickup" || prev.deliveryMode === "dine_in" ? 0 : fee,
          }));
          setLocationMsg(
            `📍 Localizado: ${loc.rua ? loc.rua + ", " : ""}${loc.bairro || loc.cidade}`,
          );
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
          setErrors((prev) => ({
            ...prev,
            cep: "Permissão de localização negada. Digite seu CEP ou o nome da rua.",
          }));
        } else {
          setErrors((prev) => ({ ...prev, cep: "Não foi possível obter a posição do GPS." }));
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
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
    const fee = getDeliveryFeeForNeighborhood(
      loc.bairro,
      deliveryConfig?.neighborhoods,
      deliveryConfig?.default_fee,
    );

    setForm((prev) => ({
      ...prev,
      rua: loc.rua,
      numero: loc.numero || prev.numero,
      bairro: loc.bairro,
      cidadeUf: `${loc.cidade} - ${loc.uf}`,
      cep: loc.cep || prev.cep || "12900-000",
      deliveryFee: prev.deliveryMode === "pickup" || prev.deliveryMode === "dine_in" ? 0 : fee,
    }));

    setStreetSuggestions([]);
    setLocationMsg(`📍 Endereço preenchido: ${loc.rua} (${loc.bairro})`);
    setTimeout(() => setLocationMsg(null), 5000);
  };

  const handleBairroInputChange = (val: string) => {
    const fee = getDeliveryFeeForNeighborhood(
      val,
      deliveryConfig?.neighborhoods,
      deliveryConfig?.default_fee,
    );
    setForm((f) => ({
      ...f,
      bairro: val,
      deliveryFee: f.deliveryMode === "pickup" || f.deliveryMode === "dine_in" ? 0 : fee,
    }));
    if (errors.bairro) setErrors((e) => ({ ...e, bairro: "" }));

    if (val.trim().length >= 2 && deliveryConfig?.neighborhoods) {
      const cleanVal = cleanString(val);
      const matches = deliveryConfig.neighborhoods.filter((n: any) =>
        cleanString(n.name).includes(cleanVal),
      );
      setBairroSuggestions(matches.slice(0, 6));
    } else {
      setBairroSuggestions([]);
    }
  };

  const handleSelectBairro = (n: { name: string; fee: number }) => {
    setForm((f) => ({
      ...f,
      bairro: n.name,
      deliveryFee: f.deliveryMode === "pickup" || f.deliveryMode === "dine_in" ? 0 : n.fee,
    }));
    setBairroSuggestions([]);
    setLocationMsg(
      `📍 Bairro selecionado: ${n.name} (Taxa: R$ ${n.fee.toFixed(2).replace(".", ",")})`,
    );
    setTimeout(() => setLocationMsg(null), 4000);
  };

  const handleDeliveryModeChange = (mode: DeliveryMode) => {
    setForm((prev) => {
      if (mode === "pickup" || mode === "dine_in") {
        return { ...prev, deliveryMode: mode, deliveryFee: 0 };
      }
      const fee = prev.bairro
        ? getDeliveryFeeForNeighborhood(
            prev.bairro,
            deliveryConfig?.neighborhoods,
            deliveryConfig?.default_fee,
          )
        : null;
      return { ...prev, deliveryMode: mode, deliveryFee: fee };
    });
    if (errors.deliveryMode) setErrors((e) => ({ ...e, deliveryMode: "" }));
  };

  const setField = (k: keyof DeliveryAddressForm) => (v: string) => {
    setForm((f) => {
      const val = k === "phone" ? formatPhoneMask(v) : v;
      return { ...f, [k]: val };
    });
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validateIdentity = useCallback(() => {
    const e: Record<string, string> = {};
    const name = sanitizeText(form.name, 80);
    const phoneDigits = form.phone.replace(/\D/g, "");

    if (name.length < 2) e.name = "Informe seu nome e sobrenome.";
    if (phoneDigits.length < 10) e.phone = "Informe um WhatsApp válido com DDD.";

    setErrors(e);
    if (Object.keys(e).length === 0) {
      persistCustomerProfile(form);
      return true;
    }
    return false;
  }, [form, persistCustomerProfile]);

  const validateDelivery = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.deliveryMode) {
      e.deliveryMode = "Escolha como deseja receber seu pedido.";
      setErrors(e);
      return false;
    }

    if (form.deliveryMode === "delivery") {
      const cep = form.cep.replace(/\D/g, "");
      if (cep.length !== 8 && (!form.rua.trim() || !form.bairro.trim())) {
        e.cep = "Informe seu CEP ou use o GPS/Busca por rua.";
      }
      if (!form.rua.trim()) e.rua = "Informe a rua.";
      if (!form.numero.trim()) e.numero = "Informe o número.";
      if (!form.bairro.trim()) e.bairro = "Informe o bairro.";
    }

    setErrors(e);
    if (Object.keys(e).length === 0) {
      persistCustomerProfile(form);
      return true;
    }
    return false;
  }, [form, persistCustomerProfile]);

  const validate = useCallback(
    (totalAmount: number) => {
      const e: Record<string, string> = {};
      const name = sanitizeText(form.name, 80);
      const phone = sanitizeText(form.phone, 20);

      if (name.length < 2) e.name = "Informe seu nome completo.";
      if (phone.replace(/\D/g, "").length < 10) e.phone = "Telefone inválido (com DDD).";

      if (!form.deliveryMode) {
        e.deliveryMode = "Escolha onde receber o pedido.";
      } else if (form.deliveryMode === "delivery") {
        const cep = form.cep.replace(/\D/g, "");
        if (cep.length !== 8 && (!form.rua.trim() || !form.bairro.trim())) {
          e.cep = "Informe seu CEP ou use o GPS/Busca por rua.";
        }
        if (!form.rua.trim()) e.rua = "Informe a rua.";
        if (!form.numero.trim()) e.numero = "Informe o número.";
        if (!form.bairro.trim()) e.bairro = "Informe o bairro.";
      }

      if (!form.payment) e.payment = "Selecione a forma de pagamento.";

      if (form.payment === "Dinheiro" && form.troco) {
        const trocoVal = Number(form.troco.replace(",", "."));
        if (isNaN(trocoVal) || trocoVal < totalAmount) {
          e.troco = `O troco deve ser maior ou igual ao total do pedido (R$ ${totalAmount.toFixed(2).replace(".", ",")}).`;
        }
      }

      setErrors(e);
      if (Object.keys(e).length === 0) {
        persistCustomerProfile(form);
        return true;
      }
      return false;
    },
    [form, persistCustomerProfile],
  );

  const resetForm = useCallback(() => {
    setForm((prev) => ({
      ...initialForm,
      // Mantém nome, telefone e endereço salvos para facilitar novas compras
      name: prev.name,
      phone: prev.phone,
      cep: prev.cep,
      rua: prev.rua,
      numero: prev.numero,
      bairro: prev.bairro,
      complemento: prev.complemento,
      cidadeUf: prev.cidadeUf,
      deliveryMode: prev.deliveryMode || (prev.rua && prev.bairro ? "delivery" : ""),
      deliveryFee:
        prev.deliveryMode === "pickup" || prev.deliveryMode === "dine_in" ? 0 : prev.deliveryFee,
    }));
    setErrors({});
    setLocationMsg(null);
  }, []);

  return {
    form,
    errors,
    hasSavedIdentity,
    hasSavedAddress,
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
    handleDeliveryModeChange,
    setField,
    validateIdentity,
    validateDelivery,
    validate,
    resetForm,
    sanitize: sanitizeText,
  };
}
