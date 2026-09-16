import { Plus } from "lucide-react";
import { Pizza, formatBRL } from "@/data/catalog";

export function PizzaCard({ pizza, onAdd }: { pizza: Pizza; onAdd: () => void }) {
  const isCustomizable =
    pizza.category === "tradicionais" ||
    pizza.category === "especiais" ||
    pizza.category === "doces" ||
    pizza.category === "doces-especiais";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-gold/50 hover:shadow-gold-glow">
      <div className="relative w-full overflow-hidden bg-secondary" style={{ paddingBottom: "75%" }}>
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,hsl(var(--gold)/0.22),hsl(var(--secondary))_62%)] px-8 text-center font-serif text-2xl text-gold">
          {pizza.name}
        </div>
        <img
          src={pizza.image}
          alt={pizza.name}
          loading="lazy"
          width={800}
          height={600}
          decoding="async"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          style={{ position: "absolute", inset: 0, zIndex: 1, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          className="transition duration-500 group-hover:scale-105"
        />

        {pizza.badge && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold-foreground">
            {pizza.badge}
          </span>
        )}
        <span className="absolute right-4 top-4 z-10 rounded-full bg-background/90 px-3 py-1 text-sm font-bold text-gold ring-1 ring-gold/40">
          {formatBRL(pizza.price)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-serif text-2xl">{pizza.name}</h3>
          {isCustomizable && (
            <span className="text-[10px] uppercase font-bold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
              Meio a Meio
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{pizza.desc}</p>
        {pizza.ingredients && (
          <p className="mt-3 text-xs tracking-wide text-muted-foreground/80">
            {pizza.ingredients}
          </p>
        )}

        <button
          type="button"
          onClick={onAdd}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-5 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold hover:text-gold-foreground"
        >
          <Plus className="h-4 w-4" /> {isCustomizable ? "Montar Pizza / Pedir" : "Adicionar ao Pedido"}
        </button>
      </div>
    </article>
  );
}
