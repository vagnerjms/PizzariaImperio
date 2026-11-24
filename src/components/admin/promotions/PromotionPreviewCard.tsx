import { Eye, Sparkles, Ticket } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import type { PromotionFormData } from "./PromotionModal";

export function PromotionPreviewCard({
  badgeText,
  couponCode,
  title,
  description,
  type,
  discountValue,
  rewardDiscountPercent,
  rewardItemName,
}: {
  badgeText: string;
  couponCode: string;
  title: string;
  description: string;
  type: PromotionFormData["type"];
  discountValue: number;
  rewardDiscountPercent: number;
  rewardItemName: string;
}) {
  return (
    <div className="pt-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
        <Eye className="h-3 w-3 text-gold" /> Pré-visualização no Site:
      </span>
      <div className="rounded-2xl border border-gold/40 bg-card/90 p-4 shadow-gold-glow">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-gold uppercase">
            <Sparkles className="h-3 w-3 fill-gold" /> {badgeText || "OFERTA RELÂMPAGO"}
          </div>
          {couponCode && (
            <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-gold/60 bg-gold/10 px-2 py-0.5 font-mono text-[10px] font-bold text-gold">
              <Ticket className="h-3 w-3" /> {couponCode}
            </span>
          )}
        </div>
        <h5 className="mt-1.5 font-serif text-base font-bold text-foreground">
          {title || "Título da Promoção"}
        </h5>
        <p className="mt-1 text-xs text-muted-foreground">
          {description || "Descrição da promoção..."}
        </p>
        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-xs font-semibold">
          <span className="text-gold">
            {type === "PERCENTAGE_DISCOUNT" && `${discountValue}% de Desconto`}
            {type === "FIXED_DISCOUNT" && `${formatBRL(discountValue)} OFF`}
            {type === "BUY_X_GET_Y" &&
              `Ganhe ${rewardDiscountPercent === 100 ? "Grátis" : `${rewardDiscountPercent}% OFF`} em 1x ${rewardItemName || "Brinde"}`}
          </span>
          <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold text-gold-foreground">
            Aproveitar
          </span>
        </div>
      </div>
    </div>
  );
}
