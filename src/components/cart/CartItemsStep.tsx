import { Plus, Minus, Trash2, Gift, Sparkles } from "lucide-react";
import { CartItem, formatBRL } from "@/data/catalog";
import { AppliedPromotionResult } from "@/lib/promotions.types";

export function CartItemsStep({
  cart,
  appliedPromotion,
  onInc,
  onDec,
  onRemove,
}: {
  cart: CartItem[];
  appliedPromotion: AppliedPromotionResult | null;
  onInc: (itemId: string) => void;
  onDec: (itemId: string) => void;
  onRemove: (itemId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {appliedPromotion && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-400 shadow-sm">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
            <Sparkles className="h-3.5 w-3.5 fill-emerald-400" />
            Promoção Ativa: {appliedPromotion.promotion.title}
          </div>
          <p className="mt-1 font-medium text-emerald-300">
            {appliedPromotion.reason}
          </p>
        </div>
      )}

      <ul className="space-y-4">
        {cart.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3.5 shadow-sm"
          >
            <div className="flex gap-3">
              <img
                src={item.flavor1.image}
                alt={item.name}
                width={72}
                height={72}
                className="h-18 w-18 flex-none rounded-xl object-cover border border-border/50"
              />
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-serif text-base leading-tight text-foreground font-bold flex items-center gap-1.5">
                      {item.name}
                    </div>
                    {item.isHalf && (
                      <span className="inline-block mt-0.5 rounded-full bg-gold/15 border border-gold/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                        🍕🍕 Meio a Meio
                      </span>
                    )}
                    {item.crust && item.crust.id !== "nenhuma" && (
                      <div className="mt-1 text-[11px] text-gold font-medium">
                        🧀 {item.crust.name} (+{formatBRL(item.crust.price)})
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remover ${item.name}`}
                    className="rounded-full p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Observações segmentadas */}
                {item.isHalf ? (
                  <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground/90 border-l-2 border-gold/40 pl-2">
                    <div>
                      <strong>1/2 {item.flavor1.name}:</strong> {item.flavor1.notes || "Padrão"}
                    </div>
                    <div>
                      <strong>1/2 {item.flavor2?.name}:</strong> {item.flavor2?.notes || "Padrão"}
                    </div>
                  </div>
                ) : item.flavor1.notes ? (
                  <div className="mt-1 text-[11px] text-muted-foreground border-l-2 border-gold/40 pl-2">
                    <strong>Obs:</strong> {item.flavor1.notes}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60">
                <button
                  type="button"
                  onClick={() => onDec(item.id)}
                  aria-label="Diminuir quantidade"
                  className="rounded-full p-1.5 text-foreground transition hover:bg-gold/20"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-6 text-center text-sm font-semibold">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onInc(item.id)}
                  aria-label="Aumentar quantidade"
                  className="rounded-full p-1.5 text-foreground transition hover:bg-gold/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gold">{formatBRL(item.totalPrice)}</div>
                {item.quantity > 1 && (
                  <div className="text-[10px] text-muted-foreground">{formatBRL(item.unitPrice)} cada</div>
                )}
              </div>
            </div>
          </li>
        ))}

        {appliedPromotion?.rewardItem && (
          <li className="flex gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-3 shadow-gold-glow">
            <div className="flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-gold/20 text-gold">
              <Gift className="h-7 w-7" />
            </div>
            <div className="flex flex-1 flex-col justify-center">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 font-serif text-base font-bold text-foreground">
                    {appliedPromotion.rewardItem.pizza_name}
                    <span className="rounded-full bg-gold px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-gold-foreground">
                      {appliedPromotion.rewardItem.is_gift ? "GRÁTIS" : "PROMO"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    1x Brinde da promoção
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs line-through text-muted-foreground">
                  {formatBRL(appliedPromotion.rewardItem.original_price)}
                </span>
                <span className="text-sm font-bold text-green-400">
                  {appliedPromotion.rewardItem.unit_price === 0
                    ? "R$ 0,00"
                    : formatBRL(appliedPromotion.rewardItem.unit_price)}
                </span>
              </div>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}

