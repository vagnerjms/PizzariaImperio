// Driver de Impressão Térmica ESC/POS via Web Serial API (Bematech MP-4200 TH / Epson / Elgin)

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

// Global active port reference in memory
let activeSerialPort: any = null;

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

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export function isPrinterConnected(): boolean {
  return activeSerialPort !== null && activeSerialPort.readable !== null;
}

export async function connectSerialPrinter(baudRate = 9600): Promise<{ success: boolean; message: string }> {
  if (!isWebSerialSupported()) {
    return {
      success: false,
      message: "Seu navegador não suporta Web Serial API. Utilize o Google Chrome, Microsoft Edge ou Opera no computador.",
    };
  }

  try {
    // Request user to select a port
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: Number(baudRate) || 9600 });
    activeSerialPort = port;

    // Listen for disconnect
    port.addEventListener("disconnect", () => {
      activeSerialPort = null;
    });

    return { success: true, message: "Impressora conectada com sucesso!" };
  } catch (err: any) {
    if (err.name === "NotFoundError" || err.message?.includes("No port selected")) {
      return { success: false, message: "Nenhuma impressora selecionada." };
    }
    return { success: false, message: `Erro ao conectar impressora: ${err.message || err}` };
  }
}

export async function disconnectSerialPrinter(): Promise<void> {
  if (activeSerialPort) {
    try {
      await activeSerialPort.close();
    } catch (e) {
      console.warn("Error closing serial port:", e);
    }
    activeSerialPort = null;
  }
}

// Helper: Normalize accents to clean standard ASCII to prevent corrupt characters on ESC/POS printers
function sanitizeText(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n\r]/g, " ");
}

function formatBRLText(val: number): string {
  return `R$ ${Number(val || 0).toFixed(2).replace(".", ",")}`;
}

// Build ESC/POS Byte Buffer
export function buildEscPosBuffer(order: PrintableOrder, settings: PrinterSettings): Uint8Array {
  const is80mm = settings.paperWidth === "80mm";
  const cols = is80mm ? 48 : 32;

  const ESC = 0x1b;
  const GS = 0x1d;

  const bytes: number[] = [];

  const addBytes = (...b: number[]) => bytes.push(...b);
  const addText = (text: string) => {
    const sanitized = sanitizeText(text);
    for (let i = 0; i < sanitized.length; i++) {
      bytes.push(sanitized.charCodeAt(i));
    }
  };

  const addLine = (text = "") => {
    addText(text + "\n");
  };

  const addDivider = (char = "-") => {
    addLine(char.repeat(cols));
  };

  const addTwoColumns = (left: string, right: string) => {
    const cleanLeft = sanitizeText(left);
    const cleanRight = sanitizeText(right);
    const space = cols - cleanLeft.length - cleanRight.length;
    if (space > 0) {
      addLine(cleanLeft + " ".repeat(space) + cleanRight);
    } else {
      addLine(cleanLeft);
      addLine(" ".repeat(Math.max(0, cols - cleanRight.length)) + cleanRight);
    }
  };

  // 1. Initialize printer
  addBytes(ESC, 0x40); // ESC @ (Reset)

  // 2. Beep if enabled
  if (settings.beep) {
    addBytes(ESC, 0x42, 0x02, 0x02); // ESC B 2 2 (Beep)
    addBytes(0x07); // BEL (Alternative beep)
  }

  // 3. Header
  addBytes(ESC, 0x61, 0x01); // Center align
  addBytes(ESC, 0x45, 0x01); // Bold ON
  addBytes(GS, 0x21, 0x11); // Double height & width
  addLine("PIZZARIA IMPERIO");
  addBytes(GS, 0x21, 0x00); // Normal size
  addLine("FORNO A LENHA * DELIVERY");
  addBytes(ESC, 0x45, 0x00); // Bold OFF

  addBytes(ESC, 0x61, 0x00); // Left align
  addDivider("=");

  // 4. Order Meta
  const createdDate = new Date(order.created_at || Date.now());
  const dateFormatted = createdDate.toLocaleDateString("pt-BR");
  const timeFormatted = createdDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const shortId = (order.id || "").slice(0, 8).toUpperCase();

  addBytes(ESC, 0x45, 0x01); // Bold ON
  addTwoColumns(`PEDIDO: #${shortId}`, `${dateFormatted} ${timeFormatted}`);
  addBytes(ESC, 0x45, 0x00); // Bold OFF
  addDivider("-");

  // 5. Customer & Delivery info
  addBytes(ESC, 0x45, 0x01);
  addLine(`CLIENTE: ${order.customer_name}`);
  addBytes(ESC, 0x45, 0x00);
  addLine(`TEL:     ${order.customer_phone}`);
  addLine(`END:     ${order.customer_address}`);

  if (order.notes) {
    addDivider(".");
    addBytes(ESC, 0x45, 0x01);
    addLine(`OBS: ${order.notes}`);
    addBytes(ESC, 0x45, 0x00);
  }

  addDivider("=");

  // 6. Items Header
  addBytes(ESC, 0x45, 0x01);
  addTwoColumns("QTD  ITEM", "VALOR");
  addBytes(ESC, 0x45, 0x00);
  addDivider("-");

  // 7. Items list
  const items = order.order_items || [];
  for (const item of items) {
    addBytes(ESC, 0x45, 0x01);
    const qtyStr = `${item.quantity}x`.padEnd(4, " ");
    const priceStr = item.subtotal === 0 ? "GRATIS" : formatBRLText(item.subtotal);
    addTwoColumns(`${qtyStr} ${item.pizza_name}`, priceStr);
    addBytes(ESC, 0x45, 0x00);
  }

  addDivider("-");

  // 8. Totals
  const subtotalCalc = items.reduce((acc, i) => acc + (i.subtotal || 0), 0);
  addTwoColumns("Subtotal:", formatBRLText(subtotalCalc));

  if (order.discount && order.discount > 0) {
    addTwoColumns(`Desconto (${order.promotion_title || "Promo"}):`, `-${formatBRLText(order.discount)}`);
  }

  if (order.delivery_fee !== undefined && order.delivery_fee !== null) {
    addTwoColumns("Taxa de Entrega:", order.delivery_fee === 0 ? "GRATIS" : formatBRLText(order.delivery_fee));
  }

  addDivider("=");

  // 9. Grand Total (Double size & Bold)
  addBytes(ESC, 0x45, 0x01); // Bold ON
  addBytes(GS, 0x21, 0x01); // Double height
  addTwoColumns("TOTAL:", formatBRLText(order.total));
  addBytes(GS, 0x21, 0x00); // Normal size
  addBytes(ESC, 0x45, 0x00); // Bold OFF

  addDivider("-");

  // 10. Payment details
  addBytes(ESC, 0x45, 0x01);
  addLine(`FORMA PGTO: ${order.payment_method.toUpperCase()}`);
  if (order.troco) {
    addLine(`TROCO PARA: ${formatBRLText(order.troco)}`);
  }
  const isPaid = order.payment_status === "paid";
  addLine(`STATUS PGTO: ${isPaid ? "PAGO ONLINE (PIX/CARTAO)" : "PAGAR NA ENTREGA"}`);
  addBytes(ESC, 0x45, 0x00);

  // 11. Footer
  addDivider("=");
  addBytes(ESC, 0x61, 0x01); // Center align
  addLine("Agradecemos a preferencia!");
  addLine("Pizzaria Imperio - O Sabor do Imperio");
  addLine(`Impresso em: ${new Date().toLocaleTimeString("pt-BR")}`);

  // 12. Feed and Cut
  addLine("\n\n\n\n"); // Feed 4 lines

  if (settings.autoCut) {
    // GS V 66 0 (Full/Partial Cut)
    addBytes(GS, 0x56, 0x42, 0x00);
    // Bematech alternative cut command
    addBytes(ESC, 0x77);
  }

  return new Uint8Array(bytes);
}

// Send buffer to the connected Web Serial port
export async function sendEscPosToSerial(buffer: Uint8Array): Promise<{ success: boolean; error?: string }> {
  if (!activeSerialPort || !activeSerialPort.writable) {
    return { success: false, error: "Impressora não está conectada na porta USB/Serial." };
  }

  try {
    const writer = activeSerialPort.writable.getWriter();
    await writer.write(buffer);
    writer.releaseLock();
    return { success: true };
  } catch (err: any) {
    console.error("Error writing to serial printer:", err);
    return { success: false, error: err.message || "Falha ao transmitir dados para a impressora." };
  }
}

// Unified Print Function (Attempts Web Serial, falls back to Thermal Browser Print)
export async function printOrderThermal(
  order: PrintableOrder,
  customSettings?: Partial<PrinterSettings>
): Promise<{ success: boolean; method: "serial" | "browser"; error?: string }> {
  const settings = { ...getStoredPrinterSettings(), ...customSettings };

  // 1. If Serial Port is open and ready, use Direct ESC/POS
  if (isPrinterConnected()) {
    const buffer = buildEscPosBuffer(order, settings);
    const result = await sendEscPosToSerial(buffer);
    if (result.success) {
      return { success: true, method: "serial" };
    }
  }

  // 2. Fallback: Native Browser Thermal Print Layout
  printOrderBrowserFallback(order, settings);
  return { success: true, method: "browser" };
}

// Browser Fallback Thermal Receipt
export function printOrderBrowserFallback(order: PrintableOrder, settings: PrinterSettings): void {
  if (typeof window === "undefined") return;

  const is80mm = settings.paperWidth === "80mm";
  const widthMm = is80mm ? "80mm" : "58mm";

  const createdDate = new Date(order.created_at || Date.now());
  const dateFormatted = createdDate.toLocaleDateString("pt-BR");
  const timeFormatted = createdDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const shortId = (order.id || "").slice(0, 8).toUpperCase();
  const isPaid = order.payment_status === "paid";

  const itemsHtml = (order.order_items || [])
    .map(
      (item) => `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-weight:bold;">
        <span>${item.quantity}x ${item.pizza_name}</span>
        <span>${item.subtotal === 0 ? "GRÁTIS" : formatBRLText(item.subtotal)}</span>
      </div>
    `
    )
    .join("");

  const subtotalCalc = (order.order_items || [])?.reduce((acc, i) => acc + (i.subtotal || 0), 0) || 0;

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Comanda #${shortId}</title>
      <style>
        @page {
          size: ${widthMm} auto;
          margin: 0;
        }
        body {
          font-family: 'Courier New', Courier, monospace, monospace;
          font-size: 13px;
          line-height: 1.3;
          color: #000;
          background: #fff;
          margin: 0;
          padding: 8px 10px;
          width: ${widthMm};
          box-sizing: border-box;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .divider-double { border-top: 2px solid #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; }
        .title { font-size: 16px; font-weight: bold; }
        .total { font-size: 17px; font-weight: bold; }
        .notes { background: #f0f0f0; padding: 4px; border-radius: 4px; margin: 4px 0; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="text-center">
        <div class="title">PIZZARIA IMPÉRIO</div>
        <div style="font-size:11px;">FORNO A LENHA · DELIVERY</div>
      </div>
      <div class="divider-double"></div>

      <div class="row bold">
        <span>PEDIDO: #${shortId}</span>
        <span>${dateFormatted} ${timeFormatted}</span>
      </div>
      <div class="divider"></div>

      <div><span class="bold">CLIENTE:</span> ${order.customer_name}</div>
      <div><span class="bold">TEL:</span> ${order.customer_phone}</div>
      <div><span class="bold">END:</span> ${order.customer_address}</div>

      ${
        order.notes
          ? `<div class="notes bold">OBS: ${order.notes}</div>`
          : ""
      }
      <div class="divider-double"></div>

      <div class="row bold" style="font-size:11px; margin-bottom:4px;">
        <span>QTD  ITEM</span>
        <span>VALOR</span>
      </div>
      <div class="divider"></div>

      ${itemsHtml}

      <div class="divider"></div>
      <div class="row">
        <span>Subtotal:</span>
        <span>${formatBRLText(subtotalCalc)}</span>
      </div>

      ${
        order.discount && order.discount > 0
          ? `<div class="row bold" style="color: #000;">
              <span>Desconto (${order.promotion_title || "Promoção"}):</span>
              <span>-${formatBRLText(order.discount)}</span>
            </div>`
          : ""
      }

      ${
        order.delivery_fee !== undefined && order.delivery_fee !== null
          ? `<div class="row">
              <span>Taxa de Entrega:</span>
              <span>${order.delivery_fee === 0 ? "GRÁTIS" : formatBRLText(order.delivery_fee)}</span>
            </div>`
          : ""
      }
      <div class="divider-double"></div>

      <div class="row total">
        <span>TOTAL:</span>
        <span>${formatBRLText(order.total)}</span>
      </div>
      <div class="divider"></div>

      <div class="bold">FORMA PGTO: ${order.payment_method.toUpperCase()}</div>
      ${order.troco ? `<div>TROCO PARA: ${formatBRLText(order.troco)}</div>` : ""}
      <div class="bold">STATUS: ${isPaid ? "PAGO ONLINE (PIX/CARTÃO)" : "PAGAR NA ENTREGA"}</div>

      <div class="divider-double"></div>
      <div class="text-center" style="font-size:11px; margin-top:6px;">
        <div>Agradecemos a preferência!</div>
        <div>Pizzaria Império</div>
        <div>Impresso às ${new Date().toLocaleTimeString("pt-BR")}</div>
      </div>
      <br><br>
    </body>
    </html>
  `;

  // Open hidden print iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(receiptHtml);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  }
}

// Test Receipt
export async function printTestReceipt(customSettings?: Partial<PrinterSettings>): Promise<{ success: boolean; message: string }> {
  const dummyOrder: PrintableOrder = {
    id: "TEST-001",
    customer_name: "Cliente Teste",
    customer_phone: "(11) 99999-9999",
    customer_address: "Rua das Pizzas, 100 - Centro, Bragança Paulista - SP",
    payment_method: "Pix",
    payment_status: "paid",
    troco: null,
    notes: "Comanda de teste da impressora térmica Bematech MP-4200",
    delivery_fee: 10,
    discount: 5,
    promotion_title: "Desconto Teste",
    total: 93,
    created_at: new Date().toISOString(),
    order_items: [
      { pizza_name: "Pizza Calabresa Especial", quantity: 1, subtotal: 48 },
      { pizza_name: "Pizza Quatro Queijos", quantity: 1, subtotal: 50 },
      { pizza_name: "Refrigerante 2L (Brinde)", quantity: 1, subtotal: 0 },
    ],
  };

  const res = await printOrderThermal(dummyOrder, customSettings);
  if (res.method === "serial") {
    return { success: true, message: "Comanda de teste impressa via USB/Serial com sucesso!" };
  }
  return { success: true, message: "Comanda de teste enviada para visualização/impressão do navegador!" };
}
