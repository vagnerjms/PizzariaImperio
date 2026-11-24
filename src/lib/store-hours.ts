export type StoreStatusOverride = "auto" | "force_open" | "force_closed";

export interface OpeningHourDay {
  enabled: boolean;
  open: string; // "HH:MM"
  close: string; // "HH:MM"
}

export type DayOfWeekKey = "0" | "1" | "2" | "3" | "4" | "5" | "6";

export type OpeningHoursMap = Record<DayOfWeekKey, OpeningHourDay>;

export interface EnabledPaymentMethods {
  pix: boolean;
  dinheiro: boolean;
  credito: boolean;
  debito: boolean;
}

export interface EnabledDeliveryModes {
  delivery: boolean;
  pickup: boolean;
  dine_in: boolean;
}

export interface StoreOperationalConfig {
  store_phone: string;
  store_status_override: StoreStatusOverride;
  pause_reason: string;
  opening_hours: OpeningHoursMap;
  enabled_payment_methods: EnabledPaymentMethods;
  enabled_delivery_modes: EnabledDeliveryModes;
}

export interface StoreOpenEvaluation {
  isOpen: boolean;
  mode: StoreStatusOverride;
  reason: string;
  nextOpenLabel: string | null;
}

export interface PublicStoreConfig extends StoreOperationalConfig {
  status: StoreOpenEvaluation;
}

export const DAY_LABELS_PT: Record<DayOfWeekKey, string> = {
  "0": "Domingo",
  "1": "Segunda",
  "2": "Terça",
  "3": "Quarta",
  "4": "Quinta",
  "5": "Sexta",
  "6": "Sábado",
};

export const DEFAULT_OPENING_HOURS: OpeningHoursMap = {
  "0": { enabled: true, open: "18:00", close: "23:30" },
  "1": { enabled: false, open: "18:00", close: "23:30" },
  "2": { enabled: true, open: "18:00", close: "23:30" },
  "3": { enabled: true, open: "18:00", close: "23:30" },
  "4": { enabled: true, open: "18:00", close: "23:30" },
  "5": { enabled: true, open: "18:00", close: "23:30" },
  "6": { enabled: true, open: "18:00", close: "23:30" },
};

export const DEFAULT_ENABLED_PAYMENT_METHODS: EnabledPaymentMethods = {
  pix: true,
  dinheiro: true,
  credito: true,
  debito: true,
};

export const DEFAULT_ENABLED_DELIVERY_MODES: EnabledDeliveryModes = {
  delivery: true,
  pickup: true,
  dine_in: true,
};

function parseMinutes(hhmm: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getSaoPauloParts(now: Date): { dayOfWeek: number; minutes: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value || "Sun";
  const hourStr = parts.find((p) => p.type === "hour")?.value || "0";
  const minuteStr = parts.find((p) => p.type === "minute")?.value || "0";
  const hour = Number(hourStr) === 24 ? 0 : Number(hourStr);
  const minute = Number(minuteStr);
  return {
    dayOfWeek: weekdayMap[weekdayStr] ?? 0,
    minutes: hour * 60 + minute,
  };
}

function findNextOpenLabel(hours: OpeningHoursMap, currentDay: number, currentMinutes: number): string | null {
  for (let offset = 0; offset < 7; offset++) {
    const dayIdx = ((currentDay + offset) % 7).toString() as DayOfWeekKey;
    const cfg = hours[dayIdx];
    if (!cfg?.enabled) continue;
    const openMin = parseMinutes(cfg.open);
    if (openMin === null) continue;
    if (offset === 0 && openMin > currentMinutes) {
      return `Hoje às ${cfg.open}`;
    }
    if (offset === 1) {
      return `Amanhã (${DAY_LABELS_PT[dayIdx]}) às ${cfg.open}`;
    }
    if (offset > 1) {
      return `${DAY_LABELS_PT[dayIdx]} às ${cfg.open}`;
    }
  }
  return null;
}

/**
 * Evaluates whether the pizzeria is currently open in America/Sao_Paulo timezone.
 * Supports overnight shifts (e.g., 18:00 -> 00:30) and manual overrides.
 */
export function evaluateStoreOpenStatus(
  config: Pick<StoreOperationalConfig, "store_status_override" | "pause_reason" | "opening_hours">,
  now: Date = new Date()
): StoreOpenEvaluation {
  const mode: StoreStatusOverride = config.store_status_override || "auto";
  const hours: OpeningHoursMap = { ...DEFAULT_OPENING_HOURS, ...(config.opening_hours || {}) };
  const { dayOfWeek, minutes } = getSaoPauloParts(now);

  if (mode === "force_open") {
    return {
      isOpen: true,
      mode,
      reason: "Loja aberta manualmente pelo painel.",
      nextOpenLabel: null,
    };
  }

  if (mode === "force_closed") {
    return {
      isOpen: false,
      mode,
      reason:
        config.pause_reason?.trim() ||
        "Recebimento de pedidos temporariamente pausado. Voltamos em breve!",
      nextOpenLabel: findNextOpenLabel(hours, dayOfWeek, minutes),
    };
  }

  // Check if we are within an overnight spillover from yesterday's shift (e.g. 18:00 -> 01:00)
  const prevDayKey = (((dayOfWeek + 6) % 7).toString()) as DayOfWeekKey;
  const prevCfg = hours[prevDayKey];
  if (prevCfg?.enabled) {
    const prevOpen = parseMinutes(prevCfg.open);
    const prevClose = parseMinutes(prevCfg.close);
    if (prevOpen !== null && prevClose !== null && prevClose <= prevOpen && minutes < prevClose) {
      return {
        isOpen: true,
        mode,
        reason: `Aberto até ${prevCfg.close}`,
        nextOpenLabel: null,
      };
    }
  }

  // Check today's schedule
  const todayKey = dayOfWeek.toString() as DayOfWeekKey;
  const todayCfg = hours[todayKey];
  if (todayCfg?.enabled) {
    const openMin = parseMinutes(todayCfg.open);
    const closeMin = parseMinutes(todayCfg.close);
    if (openMin !== null && closeMin !== null) {
      const isOvernight = closeMin <= openMin;
      const inWindow = isOvernight
        ? minutes >= openMin
        : minutes >= openMin && minutes < closeMin;
      if (inWindow) {
        return {
          isOpen: true,
          mode,
          reason: `Aberto hoje até ${todayCfg.close}`,
          nextOpenLabel: null,
        };
      }
    }
  }

  const nextOpenLabel = findNextOpenLabel(hours, dayOfWeek, minutes);
  return {
    isOpen: false,
    mode,
    reason: nextOpenLabel
      ? `Estamos fechados no momento. Próxima abertura: ${nextOpenLabel}.`
      : "Estamos fechados no momento.",
    nextOpenLabel,
  };
}

export function isPaymentMethodEnabled(
  method: string,
  enabled: EnabledPaymentMethods
): boolean {
  switch (method) {
    case "Pix":
      return enabled.pix !== false;
    case "Dinheiro":
      return enabled.dinheiro !== false;
    case "Cartão de crédito":
      return enabled.credito !== false;
    case "Cartão de débito":
      return enabled.debito !== false;
    default:
      return false;
  }
}

export function isDeliveryModeEnabled(
  mode: "delivery" | "pickup" | "dine_in",
  enabled: EnabledDeliveryModes
): boolean {
  return enabled[mode] !== false;
}

export function normalizeOpeningHours(raw?: Partial<OpeningHoursMap> | null): OpeningHoursMap {
  const result: OpeningHoursMap = { ...DEFAULT_OPENING_HOURS };
  if (!raw || typeof raw !== "object") return result;
  for (const key of ["0", "1", "2", "3", "4", "5", "6"] as DayOfWeekKey[]) {
    const entry = raw[key];
    if (entry && typeof entry === "object") {
      result[key] = {
        enabled: typeof entry.enabled === "boolean" ? entry.enabled : DEFAULT_OPENING_HOURS[key].enabled,
        open: typeof entry.open === "string" && parseMinutes(entry.open) !== null ? entry.open : DEFAULT_OPENING_HOURS[key].open,
        close: typeof entry.close === "string" && parseMinutes(entry.close) !== null ? entry.close : DEFAULT_OPENING_HOURS[key].close,
      };
    }
  }
  return result;
}
