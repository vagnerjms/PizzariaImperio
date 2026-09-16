import { Sparkles, Tag, Plus } from "lucide-react";
import { Promotion } from "@/lib/promotions.types";
import { formatBRL } from "@/data/catalog";

export function Promocoes({
  promotions,
  onAdd,
}: {
  promotions: Promotion[];
  onAdd: (id: string) => void;
}) {
  const activePromos = promotions.filter((p) => p.active);
  if (activePromos.length === 0) return null;

  return (
    <section id="promocoes" className="border-t border-border/50 bg-secondary/30 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.3em] text-gold">
            <Tag className="h-3.5 w-3.5 text-gold" /> OFERTAS ESPECIAIS
          </div>
          <h2 className="mt-3 font-serif text-3xl md:text-4xl">
            Promoções do Império
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Aproveite nossos combos e descontos automáticos calculados direto no carrinho.
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activePromos.map((promo) => (
            <article
              key={promo._id}
              className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gold/40 bg-card p-6 shadow-sm transition hover:border-gold hover:shadow-gold-glow"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-gold/15 border border-gold/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
                    {promo.trigger_type === "all" && "Todos os Pedidos"}
                    {promo.trigger_type === "min_total" && `Acima de ${formatBRL(promo.trigger_min_total || 0)}`}
                    {promo.trigger_type === "category" && `Categoria: ${promo.trigger_category}`}
                  </span>
                  <Sparkles className="h-4 w-4 text-gold" />
                </div>

                <h3 className="mt-4 font-serif text-xl font-bold text-foreground">
                  {promo.title}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {promo.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border/60">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-semibold">
                      Vantagem
                    </span>
                    <span className="font-serif text-lg font-bold text-gold">
                      {promo.type === "PERCENTAGE_DISCOUNT" && `${promo.discount_value}% OFF`}
                      {promo.type === "FIXED_DISCOUNT" && `R$ ${promo.discount_value?.toFixed(2).replace('.', ',')} OFF`}
                      {promo.type === "BUY_X_GET_Y" && `Brinde: ${promo.reward_item_name || "Grátis"}`}
                    </span>
                  </div>

                  <a
                    href="#cardapio"
                    className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95"
                  >
                    Aproveitar <Plus className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
