// Web Serial API transport for ESC/POS thermal printers (Bematech MP-4200 TH / Epson / Elgin)

let activeSerialPort: any = null;

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export function isPrinterConnected(): boolean {
  return activeSerialPort !== null && activeSerialPort.readable !== null;
}

export async function connectSerialPrinter(
  baudRate = 9600
): Promise<{ success: boolean; message: string }> {
  if (!isWebSerialSupported()) {
    return {
      success: false,
      message:
        "Seu navegador não suporta Web Serial API. Utilize o Google Chrome, Microsoft Edge ou Opera no computador.",
    };
  }

  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: Number(baudRate) || 9600 });
    activeSerialPort = port;

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

export async function sendEscPosToSerial(
  buffer: Uint8Array
): Promise<{ success: boolean; error?: string }> {
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
    return {
      success: false,
      error: err.message || "Falha ao transmitir dados para a impressora.",
    };
  }
}
