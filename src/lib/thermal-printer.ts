// Barrel re-export for modular ESC/POS & Browser Thermal Printing (src/lib/printer/*)

export {
  DEFAULT_PRINTER_SETTINGS,
  getStoredPrinterSettings,
  savePrinterSettings,
  type PrinterSettings,
  type PrintableOrder,
  type PrintableCashShift,
} from "./printer/types";

export {
  isWebSerialSupported,
  isPrinterConnected,
  connectSerialPrinter,
  disconnectSerialPrinter,
  sendEscPosToSerial,
} from "./printer/serial-transport";

export { escapeHtml, printHtmlInHiddenIframe } from "./printer/iframe-print";

export {
  buildEscPosBuffer,
  buildOrderReceiptHtml,
  printOrderBrowserFallback,
  printOrderThermal,
  printTestReceipt,
} from "./printer/order-receipt";

export {
  toPrintableShift,
  buildCashShiftEscPosBuffer,
  buildCashShiftReceiptHtml,
  printCashShiftThermal,
} from "./printer/cash-shift-receipt";
