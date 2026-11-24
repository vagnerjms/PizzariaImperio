import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectSerialPrinter,
  disconnectSerialPrinter,
  getStoredPrinterSettings,
  isPrinterConnected,
  PrintableOrder,
  PrinterSettings,
  printOrderThermal,
  printTestReceipt,
  savePrinterSettings,
} from "@/lib/thermal-printer";

export interface PrinterToastMessage {
  text: string;
  isError?: boolean;
}

/**
 * Encapsulates Web Serial thermal printer connection, settings, test printing, and timed feedback messages.
 */
export function useThermalPrinter() {
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(() =>
    getStoredPrinterSettings(),
  );
  const [printerMsg, setPrinterMsg] = useState<PrinterToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPrinterMessage = useCallback((text: string, isError = false, durationMs = 4000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPrinterMsg({ text, isError });
    timerRef.current = setTimeout(() => {
      setPrinterMsg(null);
      timerRef.current = null;
    }, durationMs);
  }, []);

  useEffect(() => {
    setPrinterConnected(isPrinterConnected());
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleConnectPrinter = useCallback(async () => {
    const res = await connectSerialPrinter(printerSettings.baudRate);
    setPrinterConnected(isPrinterConnected());
    showPrinterMessage(res.message, !res.success, 5000);
  }, [printerSettings.baudRate, showPrinterMessage]);

  const handleDisconnectPrinter = useCallback(async () => {
    await disconnectSerialPrinter();
    setPrinterConnected(false);
    showPrinterMessage("Impressora desconectada.", false, 4000);
  }, [showPrinterMessage]);

  const handleTestPrint = useCallback(async () => {
    const res = await printTestReceipt(printerSettings);
    showPrinterMessage(res.message, !res.success, 4000);
  }, [printerSettings, showPrinterMessage]);

  const handlePrintOrder = useCallback(
    async (order: PrintableOrder) => {
      const res = await printOrderThermal(order, printerSettings);
      if (res.method === "serial") {
        showPrinterMessage(`Comanda #${order.id.slice(0, 6)} impressa na térmica!`, false, 3000);
      }
    },
    [printerSettings, showPrinterMessage],
  );

  const updatePrinterSetting = useCallback(
    <K extends keyof PrinterSettings>(key: K, value: PrinterSettings[K]) => {
      const updated = savePrinterSettings({ [key]: value });
      setPrinterSettings(updated);
    },
    [],
  );

  return {
    printerConnected,
    printerSettings,
    printerMsg,
    showPrinterMessage,
    handleConnectPrinter,
    handleDisconnectPrinter,
    handleTestPrint,
    handlePrintOrder,
    updatePrinterSetting,
  };
}
