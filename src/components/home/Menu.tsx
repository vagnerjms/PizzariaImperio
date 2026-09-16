import { useState, useMemo } from "react";
import { Star, Search, X, Sparkles, ChevronRight, Plus } from "lucide-react";
import { Pizza, CATEGORIES, CATEGORY_ICONS } from "@/data/catalog";
import { cleanString } from "@/lib/delivery-config";
import { PizzaCard } from "./PizzaCard";
import { MobilePizzaCard } from "./MobilePizzaCard";

export function Menu({
  items,
  category,
  onCategory,
  onAddSingle,
  onOpenHalfAndHalf,
}: {
  items: Pizza[];
  category: string;
  onCategory: (id: (typeof CATEGORIES)[number]["id"]) => void;
  onAddSingle: (pizza: Pizza) => void;
  onOpenHalfAndHalf: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = cleanString(searchQuery);
    return items.filter(
      (p) => cleanString(p.name).includes(q) || cleanString(p.ingredients || "").includes(q)
    );
  }, [items, searchQuery]);

  const showHalfAndHalfOption =
    category === "todas" ||
    category === "tradicionais" ||
    category === "especiais" ||
    category === "doces" ||
    category === "doces-especiais";

  return (
    <section id="cardapio" className="border-t border-border/50 bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.3em] text-gold">
            <Star className="h-3 w-3 fill-gold" /> NOSSO CARDÁPIO{" "}
            <Star className="h-3 w-3 fill-gold" />
          </div>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl md:text-5xl">
            Feita com tempo,{" "}
            <span className="italic text-gradient-gold">servida com alma</span>
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-xs sm:text-sm text-muted-foreground">
            Escolha sua pizza de <strong>1 sabor inteiro</strong> ou monte sua combinação de <strong>2 sabores (Meio a Meio)</strong>.
          </p>
        </div>

        {/* 🔍 Barra de Busca Rápida no Cardápio */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar pizza, sabor, bebida..."
              className="w-full rounded-full border border-border/80 bg-card pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 shadow-sm focus:outline-none focus:ring-2 focus:ring-gold/50 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 🏷️ Barra de Categorias Deslizante (Sticky Pills no Mobile) */}
        <div className="mt-6 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            const icon = CATEGORY_ICONS[c.id] || "🍕";

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onCategory(c.id);
                  setSearchQuery("");
                }}
                className={`flex-none rounded-full px-4 py-2 text-xs sm:text-sm font-medium tracking-wide transition flex items-center gap-1.5 ${
                  active
                    ? "bg-gold text-gold-foreground shadow-gold-glow font-bold"
                    : "border border-border bg-secondary/60 text-muted-foreground hover:text-foreground active:scale-95"
                }`}
              >
                <span>{icon}</span>
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* 🍕 Card de Destaque "Monte sua Pizza Meio a Meio" (Mobile) */}
        {showHalfAndHalfOption && (
          <div
            onClick={onOpenHalfAndHalf}
            className="sm:hidden mt-6 relative overflow-hidden rounded-2xl border-2 border-gold/60 bg-gradient-to-r from-gold/25 via-gold/10 to-card p-4 cursor-pointer shadow-gold-glow active:scale-[0.98] transition"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-gold-foreground">
                  <Sparkles className="h-3 w-3 fill-gold-foreground" /> 2 Sabores
                </span>
                <h3 className="mt-1 font-serif text-base font-bold text-foreground">
                  🍕 Monte sua Pizza Meio a Meio
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Toque aqui para escolher 2 metades à sua escolha (preço pela metade de maior valor).
                </p>
              </div>
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold text-gold-foreground shadow-md">
                <ChevronRight className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}

        {/* 💻 Visualização Desktop (Grade com Card Meio a Meio Destaque + Cards de 1 Sabor) */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-7 mt-10">
          {/* Card Destaque Desktop Meio a Meio */}
          {showHalfAndHalfOption && !searchQuery && (
            <article
              onClick={onOpenHalfAndHalf}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-gold/60 bg-gradient-to-b from-gold/15 via-card to-card p-7 shadow-gold-glow cursor-pointer transition hover:border-gold hover:scale-[1.02]"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-[11px] font-black uppercase tracking-wider text-gold-foreground">
                    <Sparkles className="h-3.5 w-3.5 fill-gold-foreground" /> Personalizada
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-gold">
                    2 Sabores
                  </span>
                </div>

                <div className="mt-6 text-center">
                  <span className="text-5xl">🍕🍕</span>
                  <h3 className="mt-4 font-serif text-2xl font-bold text-foreground">
                    Monte sua Pizza Meio a Meio
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Não consegue decidir um sabor só? Escolha 2 sabores tradicionais, especiais ou doces. O valor é calculado pela metade de maior valor.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenHalfAndHalf();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110"
                >
                  <Plus className="h-4 w-4" /> Montar Pizza Meio a Meio
                </button>
              </div>
            </article>
          )}

          {filteredBySearch.map((p) => (
            <PizzaCard key={p.id} pizza={p} onAdd={() => onAddSingle(p)} />
          ))}
        </div>

        {/* 📱 Visualização Mobile Compacta (Lista Horizontal de 1 Sabor) */}
        <div className="block sm:hidden space-y-3 mt-4">
          {filteredBySearch.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum sabor encontrado para "{searchQuery}".
            </div>
          ) : (
            filteredBySearch.map((p) => (
              <MobilePizzaCard key={p.id} pizza={p} onAdd={() => onAddSingle(p)} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
