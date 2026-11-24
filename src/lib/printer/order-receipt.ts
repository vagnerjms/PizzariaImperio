import { EscPosBuilder } from "./escpos-builder";
import { escapeHtml, printHtmlInHiddenIframe } from "./iframe-print";
import { isPrinterConnected, sendEscPosToSerial } from "./serial-transport";
import {
  formatBRLReceipt,
  getStoredPrinterSettings,
  PrintableOrder,
  PrinterSettings,
} from "./types";

export function buildEscPosBuffer(order: PrintableOrder, settings: PrinterSettings): Uint8Array {
  const b = new EscPosBuilder(settings.paperWidth);

  b.init();
  if (settings.beep) b.beep();

  // Header
  b.align("center")
    .bold(true)
    .size("doubleBoth")
    .line("PIZZARIA IMPERIO")
    .size("normal")
    .line("FORNO A LENHA * DELIVERY")
    .bold(false)
    .align("left")
    .divider("=");

  // Order Meta
  const createdDate = new Date(order.created_at || Date.now());
  const dateFormatted = createdDate.toLocaleDateString("pt-BR");
  const timeFormatted = createdDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const shortId = (order.id || "").slice(0, 8).toUpperCase();

  b.bold(true)
    .twoColumns(`PEDIDO: #${shortId}`, `${dateFormatted} ${timeFormatted}`)
    .bold(false)
    .divider("-");

  // Customer & Delivery Info
  const modeLabel =
    order.delivery_mode === "pickup"
      ? "RETIRADA NO BALCAO"
      : order.delivery_mode === "dine_in"
        ? "CONSUMIR NO LOCAL"
        : "ENTREGA DELIVERY";

  b.bold(true).line(`MODALIDADE: [${modeLabel}]`);
  if (order.table_number) b.line(`MESA:    ${order.table_number}`);
  b.line(`CLIENTE: ${order.customer_name}`)
    .bold(false)
    .line(`TEL:     ${order.customer_phone}`)
    .line(`END:     ${order.customer_address}`);

  if (order.notes) {
    b.divider(".").bold(true).line(`OBS: ${order.notes}`).bold(false);
  }

  b.divider("=")
    .bold(true)
    .twoColumns("QTD  ITEM", "VALOR")
    .bold(false)
    .divider("-");

  // Items
  const items = order.order_items || [];
  for (const item of items) {
    const qtyStr = `${item.quantity}x`.padEnd(4, " ");
    const priceStr = item.subtotal === 0 ? "GRATIS" : formatBRLReceipt(item.subtotal);
    b.bold(true).twoColumns(`${qtyStr} ${item.pizza_name}`, priceStr).bold(false);
  }

  b.divider("-");

  // Totals
  const subtotalCalc = items.reduce((acc, i) => acc + (i.subtotal || 0), 0);
  b.twoColumns("Subtotal:", formatBRLReceipt(subtotalCalc));

  if (order.discount && order.discount > 0) {
    b.twoColumns(
      `Desconto (${order.promotion_title || "Promo"}):`,
      `-${formatBRLReceipt(order.discount)}`
    );
  }

  if (order.delivery_fee !== undefined && order.delivery_fee !== null) {
    b.twoColumns(
      "Taxa de Entrega:",
      order.delivery_fee === 0 ? "GRATIS" : formatBRLReceipt(order.delivery_fee)
    );
  }

  b.divider("=")
    .bold(true)
    .size("doubleHeight")
    .twoColumns("TOTAL:", formatBRLReceipt(order.total))
    .size("normal")
    .bold(false)
    .divider("-");

  // Payment details
  const isPaid = order.payment_status === "paid";
  b.bold(true).line(`FORMA PGTO: ${order.payment_method.toUpperCase()}`);
  if (order.troco) b.line(`TROCO PARA: ${formatBRLReceipt(order.troco)}`);
  b.line(`STATUS PGTO: ${isPaid ? "PAGO ONLINE (PIX/CARTAO)" : "PAGAR NA ENTREGA"}`).bold(false);

  // Footer
  b.divider("=")
    .align("center")
    .line("Agradecemos a preferencia!")
    .line("Pizzaria Imperio - O Sabor do Imperio")
    .line(`Impresso em: ${new Date().toLocaleTimeString("pt-BR")}`)
    .feedAndCut(settings.autoCut, 4);

  return b.build();
}

export function buildOrderReceiptHtml(order: PrintableOrder, settings: PrinterSettings): string {
  const widthMm = settings.paperWidth === "80mm" ? "80mm" : "58mm";
  const createdDate = new Date(order.created_at || Date.now());
  const dateFormatted = escapeHtml(createdDate.toLocaleDateString("pt-BR"));
  const timeFormatted = escapeHtml(
    createdDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
  const shortId = escapeHtml((order.id || "").slice(0, 8).toUpperCase());
  const isPaid = order.payment_status === "paid";

  const itemsHtml = (order.order_items || [])
    .map(
      (item) => `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-weight:bold;">
        <span>${escapeHtml(item.quantity)}x ${escapeHtml(item.pizza_name)}</span>
        <span>${item.subtotal === 0 ? "GRÁTIS" : escapeHtml(formatBRLReceipt(item.subtotal))}</span>
      </div>
    `
    )
    .join("");

  const subtotalCalc = (order.order_items || []).reduce((acc, i) => acc + (i.subtotal || 0), 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Comanda #${shortId}</title>
      <style>
        @page { size: ${widthMm} auto; margin: 0; }
        body {
          font-family: 'Courier New', Courier, monospace;
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

      <div><span class="bold">MODALIDADE:</span> ${
        order.delivery_mode === "pickup"
          ? "RETIRADA NO BALCÃO"
          : order.delivery_mode === "dine_in"
            ? "CONSUMIR NO LOCAL"
            : "ENTREGA DELIVERY"
      }</div>
      ${order.table_number ? `<div><span class="bold">MESA:</span> ${escapeHtml(order.table_number)}</div>` : ""}
      <div><span class="bold">CLIENTE:</span> ${escapeHtml(order.customer_name)}</div>
      <div><span class="bold">TEL:</span> ${escapeHtml(order.customer_phone)}</div>
      <div><span class="bold">END:</span> ${escapeHtml(order.customer_address)}</div>

      ${order.notes ? `<div class="notes bold">OBS: ${escapeHtml(order.notes)}</div>` : ""}
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
        <span>${escapeHtml(formatBRLReceipt(subtotalCalc))}</span>
      </div>

      ${
        order.discount && order.discount > 0
          ? `<div class="row bold" style="color: #000;">
              <span>Desconto (${escapeHtml(order.promotion_title || "Promoção")}):</span>
              <span>-${escapeHtml(formatBRLReceipt(order.discount))}</span>
            </div>`
          : ""
      }

      ${
        order.delivery_fee !== undefined && order.delivery_fee !== null
          ? `<div class="row">
              <span>Taxa de Entrega:</span>
              <span>${order.delivery_fee === 0 ? "GRÁTIS" : escapeHtml(formatBRLReceipt(order.delivery_fee))}</span>
            </div>`
          : ""
      }
      <div class="divider-double"></div>

      <div class="row total">
        <span>TOTAL:</span>
        <span>${escapeHtml(formatBRLReceipt(order.total))}</span>
      </div>
      <div class="divider"></div>

      <div class="bold">FORMA PGTO: ${escapeHtml((order.payment_method || "").toUpperCase())}</div>
      ${order.troco ? `<div>TROCO PARA: ${escapeHtml(formatBRLReceipt(order.troco))}</div>` : ""}
      <div class="bold">STATUS: ${isPaid ? "PAGO ONLINE (PIX/CARTÃO)" : "PAGAR NA ENTREGA"}</div>

      <div class="divider-double"></div>
      <div class="text-center" style="font-size:11px; margin-top:6px;">
        <div>Agradecemos a preferência!</div>
        <div>Pizzaria Império</div>
        <div>Impresso às ${escapeHtml(new Date().toLocaleTimeString("pt-BR"))}</div>
      </div>
      <br><br>
    </body>
    </html>
  `;
}

export function printOrderBrowserFallback(order: PrintableOrder, settings: PrinterSettings): void {
  printHtmlInHiddenIframe(buildOrderReceiptHtml(order, settings));
}

export async function printOrderThermal(
  order: PrintableOrder,
  customSettings?: Partial<PrinterSettings>
): Promise<{ success: boolean; method: "serial" | "browser"; error?: string }> {
  const settings = { ...getStoredPrinterSettings(), ...customSettings };

  if (isPrinterConnected()) {
    const buffer = buildEscPosBuffer(order, settings);
    const result = await sendEscPosToSerial(buffer);
    if (result.success) {
      return { success: true, method: "serial" };
    }
  }

  printOrderBrowserFallback(order, settings);
  return { success: true, method: "browser" };
}

export async function printTestReceipt(
  customSettings?: Partial<PrinterSettings>
): Promise<{ success: boolean; message: string }> {
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
  return {
    success: true,
    message: "Comanda de teste enviada para visualização/impressão do navegador!",
  };
}
