import { Check } from "lucide-react";
import type { CrustOption } from "@/data/catalog";
import { formatBRL } from "@/lib/formatters";

export function CrustSelector({
  crusts,
  selectedCrust,
  onSelect,
}: {
  crusts: CrustOption[];
  selectedCrust: CrustOption;
  onSelect: (crust: CrustOption) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
      {crusts.map((crust) => {
        const isSelected = selectedCrust.id === crust.id;
        return (
          <button
            key={crust.id}
            type="button"
            onClick={() => onSelect(crust)}
            className={`flex items-center justify-between p-3 rounded-xl border text-xs text-left transition ${
              isSelected
                ? "border-gold bg-gold/20 text-gold font-bold shadow-gold-glow"
                : "border-border bg-card text-foreground hover:border-border/80"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                  isSelected ? "border-gold bg-gold text-gold-foreground" : "border-border"
                }`}
              >
                {isSelected && <Check className="h-2 w-2 stroke-[3]" />}
              </div>
              <span>{crust.name}</span>
            </div>
            <span
              className={`text-[11px] font-bold ${isSelected ? "text-gold" : "text-muted-foreground"}`}
            >
              {crust.price === 0 ? "Grátis" : `+${formatBRL(crust.price)}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
