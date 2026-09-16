import { Plus } from "lucide-react";
import { Pizza, formatBRL } from "@/data/catalog";

export function MobilePizzaCard({ pizza, onAdd }: { pizza: Pizza; onAdd: () => void }) {
  const isCustomizable =
    pizza.category === "tradicionais" ||
    pizza.category === "especiais" ||
    pizza.category === "doces" ||
    pizza.category === "doces-especiais";

  return (
    <article
      onClick={onAdd}
      className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/70 bg-card active:scale-[0.98] transition-transform duration-150 shadow-sm hover:border-gold/50 cursor-pointer"
    >
      {/* Informações da Pizza à Esquerda */}
      <div className="flex flex-1 flex-col justify-between min-w-0 pr-1">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-serif text-base font-bold text-foreground leading-tight truncate">
              {pizza.name}
            </h3>
            {pizza.badge && (
              <span className="rounded-full bg-gold/15 border border-gold/30 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-gold">
                {pizza.badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-snug">
            {pizza.ingredients || pizza.desc}
          </p>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <span className="font-serif text-base font-bold text-gold">
            {formatBRL(pizza.price)}
          </span>
          {isCustomizable && (
            <span className="text-[10px] text-muted-foreground/80 bg-secondary/80 px-1.5 py-0.5 rounded border border-border/60">
              Meio a Meio
            </span>
          )}
        </div>
      </div>

      {/* Foto Quadrada Compacta 80x80px & Botão à Direita */}
      <div className="relative flex-none w-20 h-20 rounded-xl overflow-hidden bg-secondary border border-border/50">
        <img
          src={pizza.image}
          alt={pizza.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/10" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-gold-foreground shadow-md transition hover:scale-110 active:scale-90"
        >
          <Plus className="h-3.5 w-3.5 stroke-[3]" />
        </button>
      </div>
    </article>
  );
}
