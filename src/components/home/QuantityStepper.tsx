import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  value,
  min = 1,
  max = 20,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (nextValue: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1 flex-none shadow-sm">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Diminuir quantidade"
        className="rounded-full p-1 text-foreground transition hover:bg-gold/20 disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-5 text-center text-xs font-bold">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Aumentar quantidade"
        className="rounded-full p-1 text-foreground transition hover:bg-gold/20 disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
