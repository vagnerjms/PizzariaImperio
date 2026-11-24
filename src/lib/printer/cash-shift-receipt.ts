import type { CashShiftRow, CashShiftSummary } from "@/lib/cash-domain";
import { EscPosBuilder } from "./escpos-builder";
import { escapeHtml, printHtmlInHiddenIframe } from "./iframe-print";
import { isPrinterConnected, sendEscPosToSerial } from "./serial-transport";
import {
  formatBRLReceipt,
  getStoredPrinterSettings,
  PrintableCashShift,
  PrinterSettings,
} from "./types";

export function toPrintableShift(
  shift: CashShiftRow,
  summary?: CashShiftSummary | null,
): PrintableCashShift {
  const byPayment = shift.summary_by_payment ||
    summary?.byPayment || {
      pix: 0,
      dinheiro: 0,
      credito: 0,
      debito: 0,
      outros: 0,
    };

  return {
    id: shift.id,
    opened_by: shift.opened_by,
    opened_at: shift.opened_at,
    closed_by: shift.closed_by,
    closed_at: shift.closed_at,
    opening_balance: shift.opening_balance,
    expected_cash: shift.expected_cash ?? summary?.expectedCash ?? 0,
    counted_cash: shift.counted_cash,
    cash_difference: shift.cash_difference,
    gross_sales: shift.gross_sales ?? summary?.grossSales ?? 0,
    total_orders: shift.total_orders ?? summary?.totalOrders ?? 0,
    by_payment: byPayment,
    movements: shift.movements.map((m) => ({
      type: m.type,
      amount: m.amount,
      reason: m.reason,
    })),
    closing_notes: shift.closing_notes,
  };
}

export function buildCashShiftEscPosBuffer(
  shift: PrintableCashShift,
  settings: PrinterSettings,
): Uint8Array {
  const b = new EscPosBuilder(settings.paperWidth);

  b.init();
  if (settings.beep) b.beep();

  b.align("center")
    .bold(true)
    .line("PIZZARIA IMPERIO")
    .line("FECHAMENTO DE CAIXA (PDV)")
    .bold(false)
    .divider("=")
    .align("left");

  const openDt = new Date(shift.opened_at);
  const closeDt = shift.closed_at ? new Date(shift.closed_at) : new Date();
  b.twoColumns("TURNO:", `#${shift.id.slice(0, 8).toUpperCase()}`)
    .line(
      `ABERTURA: ${openDt.toLocaleDateString("pt-BR")} ${openDt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    )
    .line(`ABERTO POR: ${shift.opened_by}`)
    .line(
      `FECHAMENTO: ${closeDt.toLocaleDateString("pt-BR")} ${closeDt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    );
  if (shift.closed_by) b.line(`FECHADO POR: ${shift.closed_by}`);
  b.divider("-");

  b.bold(true)
    .line("VENDAS POR FORMA DE PAGAMENTO")
    .bold(false)
    .twoColumns("Dinheiro:", formatBRLReceipt(shift.by_payment.dinheiro))
    .twoColumns("Pix:", formatBRLReceipt(shift.by_payment.pix))
    .twoColumns("Cartao Credito:", formatBRLReceipt(shift.by_payment.credito))
    .twoColumns("Cartao Debito:", formatBRLReceipt(shift.by_payment.debito));
  if ((shift.by_payment.outros || 0) > 0) {
    b.twoColumns("Outros:", formatBRLReceipt(shift.by_payment.outros || 0));
  }
  b.twoColumns(
    `Total Vendas (${shift.total_orders} ped):`,
    formatBRLReceipt(shift.gross_sales),
  ).divider("-");

  const totalSuprimentos = shift.movements
    .filter((m) => m.type === "suprimento")
    .reduce((acc, m) => acc + m.amount, 0);
  const totalSangrias = shift.movements
    .filter((m) => m.type === "sangria")
    .reduce((acc, m) => acc + m.amount, 0);

  b.bold(true)
    .line("CONFERENCIA DA GAVETA")
    .bold(false)
    .twoColumns("Fundo de Troco:", formatBRLReceipt(shift.opening_balance))
    .twoColumns("(+) Vendas Dinheiro:", formatBRLReceipt(shift.by_payment.dinheiro))
    .twoColumns("(+) Suprimentos:", formatBRLReceipt(totalSuprimentos))
    .twoColumns("(-) Sangrias:", formatBRLReceipt(totalSangrias))
    .divider("=")
    .bold(true)
    .twoColumns("ESPERADO GAVETA:", formatBRLReceipt(shift.expected_cash));

  if (shift.counted_cash !== null) {
    b.twoColumns("CONTADO GAVETA:", formatBRLReceipt(shift.counted_cash));
    const diff = shift.cash_difference ?? 0;
    const diffLabel = diff === 0 ? "BATIDO" : diff > 0 ? "SOBRA" : "FALTA";
    b.twoColumns(
      `DIFERENCA (${diffLabel}):`,
      `${diff >= 0 ? "+" : "-"}${formatBRLReceipt(Math.abs(diff))}`,
    );
  }
  b.bold(false);

  if (shift.movements.length > 0) {
    b.divider("-").line("MOVIMENTACOES:");
    for (const m of shift.movements) {
      const prefix = m.type === "suprimento" ? "[+]" : "[-]";
      b.twoColumns(`${prefix} ${m.reason.slice(0, b.cols - 14)}`, formatBRLReceipt(m.amount));
    }
  }

  if (shift.closing_notes) {
    b.divider(".").line(`OBS: ${shift.closing_notes}`);
  }

  b.divider("=")
    .align("center")
    .line(`Impresso em ${new Date().toLocaleString("pt-BR")}`)
    .feedAndCut(settings.autoCut, 3);

  return b.build();
}

export function buildCashShiftReceiptHtml(
  shift: PrintableCashShift,
  settings: PrinterSettings,
): string {
  const widthCss = settings.paperWidth === "80mm" ? "76mm" : "54mm";
  const openDt = new Date(shift.opened_at);
  const closeDt = shift.closed_at ? new Date(shift.closed_at) : new Date();
  const totalSuprimentos = shift.movements
    .filter((m) => m.type === "suprimento")
    .reduce((acc, m) => acc + m.amount, 0);
  const totalSangrias = shift.movements
    .filter((m) => m.type === "sangria")
    .reduce((acc, m) => acc + m.amount, 0);
  const diff = shift.cash_difference ?? 0;
  const diffLabel = diff === 0 ? "BATIDO" : diff > 0 ? "SOBRA" : "FALTA";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Fechamento de Caixa #${escapeHtml(shift.id.slice(0, 8))}</title>
      <style>
        @page { margin: 0; size: ${settings.paperWidth} auto; }
        body { font-family: 'Courier New', Courier, monospace; width: ${widthCss}; margin: 0 auto; padding: 6px 4px; color: #000; font-size: 12px; line-height: 1.35; }
        .text-center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .divider-double { border-top: 2px solid #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; gap: 6px; }
      </style>
    </head>
    <body>
      <div class="text-center bold">
        <div style="font-size:15px;">PIZZARIA IMPÉRIO</div>
        <div style="font-size:11px;">FECHAMENTO DE CAIXA (PDV)</div>
      </div>
      <div class="divider-double"></div>
      <div class="row"><span>Turno:</span><span class="bold">#${escapeHtml(shift.id.slice(0, 8).toUpperCase())}</span></div>
      <div>Abertura: ${escapeHtml(openDt.toLocaleString("pt-BR"))}</div>
      <div>Aberto por: ${escapeHtml(shift.opened_by)}</div>
      <div>Fechamento: ${escapeHtml(closeDt.toLocaleString("pt-BR"))}</div>
      ${shift.closed_by ? `<div>Fechado por: ${escapeHtml(shift.closed_by)}</div>` : ""}
      <div class="divider"></div>
      <div class="bold">VENDAS POR PAGAMENTO</div>
      <div class="row"><span>Dinheiro</span><span>${escapeHtml(formatBRLReceipt(shift.by_payment.dinheiro))}</span></div>
      <div class="row"><span>Pix</span><span>${escapeHtml(formatBRLReceipt(shift.by_payment.pix))}</span></div>
      <div class="row"><span>Cartão Crédito</span><span>${escapeHtml(formatBRLReceipt(shift.by_payment.credito))}</span></div>
      <div class="row"><span>Cartão Débito</span><span>${escapeHtml(formatBRLReceipt(shift.by_payment.debito))}</span></div>
      <div class="row bold" style="margin-top:4px;"><span>Vendas (${shift.total_orders} ped.)</span><span>${escapeHtml(formatBRLReceipt(shift.gross_sales))}</span></div>
      <div class="divider"></div>
      <div class="bold">CONFERÊNCIA DA GAVETA</div>
      <div class="row"><span>Fundo de Troco</span><span>${escapeHtml(formatBRLReceipt(shift.opening_balance))}</span></div>
      <div class="row"><span>(+) Dinheiro</span><span>${escapeHtml(formatBRLReceipt(shift.by_payment.dinheiro))}</span></div>
      <div class="row"><span>(+) Suprimentos</span><span>${escapeHtml(formatBRLReceipt(totalSuprimentos))}</span></div>
      <div class="row"><span>(-) Sangrias</span><span>${escapeHtml(formatBRLReceipt(totalSangrias))}</span></div>
      <div class="divider-double"></div>
      <div class="row bold"><span>ESPERADO GAVETA</span><span>${escapeHtml(formatBRLReceipt(shift.expected_cash))}</span></div>
      ${
        shift.counted_cash !== null
          ? `<div class="row bold"><span>CONTADO GAVETA</span><span>${escapeHtml(formatBRLReceipt(shift.counted_cash))}</span></div>
             <div class="row bold"><span>DIFERENÇA (${diffLabel})</span><span>${diff >= 0 ? "+" : "-"}${escapeHtml(formatBRLReceipt(Math.abs(diff)))}</span></div>`
          : ""
      }
      ${
        shift.movements.length > 0
          ? `<div class="divider"></div><div class="bold">MOVIMENTAÇÕES</div>` +
            shift.movements
              .map(
                (m) =>
                  `<div class="row"><span>${m.type === "suprimento" ? "[+]" : "[-]"} ${escapeHtml(m.reason)}</span><span>${escapeHtml(formatBRLReceipt(m.amount))}</span></div>`,
              )
              .join("")
          : ""
      }
      ${
        shift.closing_notes
          ? `<div class="divider"></div><div><span class="bold">OBS:</span> ${escapeHtml(shift.closing_notes)}</div>`
          : ""
      }
      <div class="divider-double"></div>
      <div class="text-center" style="font-size:10px;">Impresso em ${escapeHtml(new Date().toLocaleString("pt-BR"))}</div>
      <br><br>
    </body>
    </html>
  `;
}

export async function printCashShiftThermal(
  shift: PrintableCashShift,
  customSettings?: Partial<PrinterSettings>,
): Promise<{ success: boolean; method: "serial" | "browser" }> {
  const settings = { ...getStoredPrinterSettings(), ...customSettings };

  if (isPrinterConnected()) {
    const buffer = buildCashShiftEscPosBuffer(shift, settings);
    const res = await sendEscPosToSerial(buffer);
    if (res.success) {
      return { success: true, method: "serial" };
    }
    console.error("Erro na impressão serial do fechamento de caixa, usando navegador:", res.error);
  }

  printHtmlInHiddenIframe(buildCashShiftReceiptHtml(shift, settings));
  return { success: true, method: "browser" };
}
