import { Plus } from "lucide-react";
import { Pizza } from "@/data/catalog";
import { formatBRL, isPizzaCategory } from "@/lib/formatters";

export function PizzaCard({ pizza, onAdd }: { pizza: Pizza; onAdd: () => void }) {
  const isPizza = isPizzaCategory(pizza.category);

  return (
    <article
      onClick={onAdd}
      className="relative group flex flex-row-reverse sm:flex-col items-center sm:items-stretch justify-between sm:justify-start gap-3 sm:gap-0 p-3.5 sm:p-0 overflow-hidden rounded-2xl border border-border/70 sm:border-border bg-card shadow-sm sm:shadow-none transition hover:border-gold/50 sm:hover:shadow-gold-glow active:scale-[0.98] sm:active:scale-100 cursor-pointer sm:cursor-default"
    >
      {/* Imagem: miniatura 80x80 à direita no Mobile / 4:3 full-width no topo no Desktop */}
      <div className="relative flex-none w-20 h-20 sm:w-full sm:h-auto sm:aspect-[4/3] rounded-xl sm:rounded-none overflow-hidden bg-secondary border border-border/50 sm:border-0">
        <div className="hidden sm:flex absolute inset-0 items-center justify-center bg-[radial-gradient(circle_at_center,hsl(var(--gold)/0.22),hsl(var(--secondary))_62%)] px-8 text-center font-serif text-2xl text-gold">
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
          className="absolute inset-0 z-[1] h-full w-full object-cover transition duration-500 sm:group-hover:scale-105"
        />
        <div className="sm:hidden absolute inset-0 z-[2] bg-black/10" />

        {pizza.badge && (
          <span className="hidden sm:inline-block absolute left-4 top-4 z-10 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold-foreground">
            {pizza.badge}
          </span>
        )}
        <span className="hidden sm:inline-block absolute right-4 top-4 z-10 rounded-full bg-background/90 px-3 py-1 text-sm font-bold text-gold ring-1 ring-gold/40">
          {formatBRL(pizza.price)}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col justify-between min-w-0 pr-1 sm:pr-0 sm:p-6">
        <div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
            <h3 className="font-serif text-base sm:text-2xl font-bold sm:font-normal text-foreground leading-tight truncate sm:whitespace-normal">
              {pizza.name}
            </h3>
            {pizza.badge && (
              <span className="sm:hidden rounded-full bg-gold/15 border border-gold/30 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-gold">
                {pizza.badge}
              </span>
            )}
            {isPizza && (
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/60 flex-none">
                1 Sabor
              </span>
            )}
          </div>

          {/* Mobile: descrição compacta */}
          <p className="sm:hidden mt-1 text-xs text-muted-foreground line-clamp-2 leading-snug">
            {pizza.ingredients || pizza.desc}
          </p>

          {/* Desktop: descrição completa + ingredientes */}
          <p className="hidden sm:block mt-2 text-sm text-muted-foreground">{pizza.desc}</p>
          {pizza.ingredients && (
            <p className="hidden sm:block mt-3 text-xs tracking-wide text-muted-foreground/80">
              {pizza.ingredients}
            </p>
          )}
        </div>

        {/* Preço inline no Mobile */}
        <div className="sm:hidden mt-2.5 flex items-center gap-2">
          <span className="font-serif text-base font-bold text-gold">{formatBRL(pizza.price)}</span>
          {isPizza && (
            <span className="text-[10px] text-muted-foreground/80 bg-secondary/80 px-1.5 py-0.5 rounded border border-border/60">
              1 Sabor
            </span>
          )}
        </div>

        {/* Botão único responsivo (ícone compacto no canto da foto no Mobile / botão completo no Desktop) */}
        <button
          type="button"
          aria-label={isPizza ? `Pedir ${pizza.name}` : `Adicionar ${pizza.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          className="absolute bottom-4 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gold text-gold-foreground shadow-md transition hover:scale-110 active:scale-90 sm:static sm:mt-6 sm:inline-flex sm:h-auto sm:w-auto sm:gap-2 sm:border sm:border-gold/50 sm:bg-gold/10 sm:px-5 sm:py-2.5 sm:text-sm sm:font-semibold sm:text-gold sm:shadow-none sm:hover:scale-100 sm:hover:bg-gold sm:hover:text-gold-foreground sm:active:scale-95"
        >
          <Plus className="h-3.5 w-3.5 stroke-[3] sm:h-4 sm:w-4 sm:stroke-2" />
          <span className="hidden sm:inline">
            {isPizza ? "Pedir Pizza Inteira" : "Adicionar ao Pedido"}
          </span>
        </button>
      </div>
    </article>
  );
}
