import { Unlock } from "lucide-react";

export function OpenShiftCard({
  openingBalance,
  submitting,
  onChangeOpeningBalance,
  onSubmit,
}: {
  openingBalance: string;
  submitting: boolean;
  onChangeOpeningBalance: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-card p-6 max-w-xl space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <Unlock className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-serif text-lg font-bold">Abrir Caixa do Turno</h3>
          <p className="text-xs text-muted-foreground">
            Nenhum caixa aberto no momento. Informe o fundo de troco inicial da gaveta.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">
          Fundo de Troco Inicial (R$)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={openingBalance}
          onChange={(e) => onChangeOpeningBalance(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold focus:border-gold focus:outline-none"
          placeholder="100.00"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-foreground hover:brightness-110 transition disabled:opacity-50"
      >
        <Unlock className="h-4 w-4" />
        {submitting ? "Abrindo..." : "Abrir Turno Agora"}
      </button>
    </form>
  );
}
