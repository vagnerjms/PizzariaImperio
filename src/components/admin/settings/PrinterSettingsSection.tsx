import { LogOut, Printer, Usb } from "lucide-react";
import type { PrinterSettings } from "@/lib/thermal-printer";

export function PrinterSettingsSection({
  printerConnected,
  printerSettings,
  onConnectPrinter,
  onDisconnectPrinter,
  onTestPrint,
  onUpdatePrinterSetting,
}: {
  printerConnected: boolean;
  printerSettings: PrinterSettings;
  onConnectPrinter: () => void;
  onDisconnectPrinter: () => void;
  onTestPrint: () => void;
  onUpdatePrinterSetting: <K extends keyof PrinterSettings>(
    key: K,
    value: PrinterSettings[K],
  ) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-gold/10 p-2.5 text-gold">
            <Printer className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-serif text-lg leading-tight">Impressora Térmica de Comandas</h2>
            <p className="text-xs text-muted-foreground">
              Impressão direta ESC/POS via USB (Bematech MP-4200 TH, Epson, Elgin, etc.)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
              printerConnected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                printerConnected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
              }`}
            />
            {printerConnected ? "USB Conectada" : "Desconectada"}
          </span>
        </div>
      </header>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          {!printerConnected ? (
            <button
              type="button"
              onClick={onConnectPrinter}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95"
            >
              <Usb className="h-4 w-4" /> Conectar Impressora USB (Bematech MP-4200)
            </button>
          ) : (
            <button
              type="button"
              onClick={onDisconnectPrinter}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-destructive transition hover:bg-destructive/20 active:scale-95"
            >
              <LogOut className="h-4 w-4" /> Desconectar USB
            </button>
          )}

          <button
            type="button"
            onClick={onTestPrint}
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gold transition hover:bg-gold hover:text-gold-foreground active:scale-95"
          >
            <Printer className="h-4 w-4" /> Imprimir Comanda de Teste
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/40">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Largura da Bobina
            </label>
            <select
              value={printerSettings.paperWidth}
              onChange={(e) =>
                onUpdatePrinterSetting("paperWidth", e.target.value as "80mm" | "58mm")
              }
              className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
            >
              <option value="80mm">80mm / 48 colunas (Padrão MP-4200 TH / TM-T20)</option>
              <option value="58mm">58mm / 32 colunas (Mini térmica)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Baud Rate (Velocidade Serial)
            </label>
            <select
              value={printerSettings.baudRate}
              onChange={(e) => onUpdatePrinterSetting("baudRate", Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
            >
              <option value={9600}>9600 bps (Padrão Bematech / Elgin)</option>
              <option value={115200}>115200 bps (Alta velocidade)</option>
              <option value={19200}>19200 bps</option>
              <option value={38400}>38400 bps</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-border/40">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={printerSettings.autoPrintOnAccept}
              onChange={(e) => onUpdatePrinterSetting("autoPrintOnAccept", e.target.checked)}
              className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
            />
            <div>
              <span className="text-sm font-semibold text-foreground block">
                Imprimir comanda automaticamente ao aceitar pedido
              </span>
              <span className="text-xs text-muted-foreground">
                Dispara a comanda para a cozinha assim que o atendente clicar em &quot;Iniciar
                preparo&quot;
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={printerSettings.autoCut}
              onChange={(e) => onUpdatePrinterSetting("autoCut", e.target.checked)}
              className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
            />
            <div>
              <span className="text-sm font-semibold text-foreground block">
                Acionar guilhotina (corte automático de papel)
              </span>
              <span className="text-xs text-muted-foreground">
                Envia o comando de corte automático ao final da comanda
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={printerSettings.beep}
              onChange={(e) => onUpdatePrinterSetting("beep", e.target.checked)}
              className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
            />
            <div>
              <span className="text-sm font-semibold text-foreground block">
                Emitir alerta sonoro (Beep)
              </span>
              <span className="text-xs text-muted-foreground">
                A impressora emite um bip sonoro para alertar a cozinha
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
