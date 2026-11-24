export interface PrinterSettings {
  baudRate: number;
  paperWidth: "80mm" | "58mm";
  autoCut: boolean;
  beep: boolean;
  autoPrintOnAccept: boolean;
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  baudRate: 9600,
  paperWidth: "80mm",
  autoCut: true,
  beep: true,
  autoPrintOnAccept: true,
};

export interface PrintableOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_mode?: "delivery" | "pickup" | "dine_in";
  table_number?: string | null;
  payment_method: string;
  payment_status?: string;
  troco?: number | null;
  notes?: string | null;
  delivery_fee?: number | null;
  discount?: number | null;
  promotion_title?: string | null;
  total: number;
  created_at: string | Date;
  order_items: Array<{
    id?: string;
    pizza_name: string;
    quantity: number;
    subtotal: number;
  }>;
}

export interface PrintableCashShift {
  id: string;
  opened_by: string;
  opened_at: string;
  closed_by?: string | null;
  closed_at?: string | null;
  opening_balance: number;
  expected_cash: number;
  counted_cash: number | null;
  cash_difference: number | null;
  gross_sales: number;
  total_orders: number;
  by_payment: {
    pix: number;
    dinheiro: number;
    credito: number;
    debito: number;
    outros?: number;
  };
  movements: Array<{
    type: "sangria" | "suprimento";
    amount: number;
    reason: string;
  }>;
  closing_notes?: string | null;
}

export function getStoredPrinterSettings(): PrinterSettings {
  if (typeof window === "undefined") return DEFAULT_PRINTER_SETTINGS;
  try {
    const saved = localStorage.getItem("printer_settings");
    return saved ? { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(saved) } : DEFAULT_PRINTER_SETTINGS;
  } catch {
    return DEFAULT_PRINTER_SETTINGS;
  }
}

export function savePrinterSettings(settings: Partial<PrinterSettings>): PrinterSettings {
  const updated = { ...getStoredPrinterSettings(), ...settings };
  if (typeof window !== "undefined") {
    localStorage.setItem("printer_settings", JSON.stringify(updated));
  }
  return updated;
}

export function formatBRLReceipt(val: number): string {
  return `R$ ${Number(val || 0)
    .toFixed(2)
    .replace(".", ",")}`;
}
