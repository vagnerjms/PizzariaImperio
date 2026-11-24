import { useState } from "react";
import { X } from "lucide-react";
import { Pizza, CartItem, CRUST_OPTIONS, CrustOption } from "@/data/catalog";
import { formatBRL } from "@/lib/formatters";
import { CrustSelector } from "./CrustSelector";
import { QuantityStepper } from "./QuantityStepper";

export function SinglePizzaModal({
  pizza,
  crustOptions = CRUST_OPTIONS,
  onClose,
  onAddCustomized,
}: {
  pizza: Pizza;
  crustOptions?: CrustOption[];
  onClose: () => void;
  onAddCustomized: (item: CartItem) => void;
}) {
  const availableCrusts = crustOptions.length > 0 ? crustOptions : CRUST_OPTIONS;
  const [selectedCrust, setSelectedCrust] = useState<CrustOption>(availableCrusts[0]);
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);

  const unitPrice = pizza.price + selectedCrust.price;
  const totalPrice = unitPrice * qty;

  const handleConfirm = () => {
    const cartItemId = `${pizza.id}_single_${selectedCrust.id}_${Date.now()}`;

    const cartItem: CartItem = {
      id: cartItemId,
      pizzaId: pizza.id,
      name: pizza.name,
      category: pizza.category,
      isHalf: false,
      flavor1: {
        id: pizza.id,
        name: pizza.name,
        price: pizza.price,
        notes: notes.trim(),
        image: pizza.image,
      },
      crust: selectedCrust,
      unitPrice,
      quantity: qty,
      totalPrice,
    };

    onAddCustomized(cartItem);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
    >
      {/* Container Responsivo: Bottom Sheet no Mobile / Dialog no Desktop */}
      <div className="relative flex flex-col w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl border border-gold/40 bg-card shadow-2xl overflow-hidden text-foreground">
        {/* Header com Imagem e Fechar */}
        <div className="relative flex-none h-40 sm:h-48 w-full overflow-hidden bg-secondary">
          <img
            src={pizza.image}
            alt={pizza.name}
            className="w-full h-full object-cover brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />

          {/* Barra superior de arrasto no Mobile */}
          <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-white/40" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-md transition hover:bg-gold hover:text-gold-foreground"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-5 right-5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-foreground">
                1 Sabor (Pizza Inteira)
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                8 Fatias · Massa 48h
              </span>
            </div>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-foreground">
              {pizza.name}
            </h2>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* 1. Descrição e Ingredientes */}
          <div className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gold">
                1. Detalhes do Sabor
              </span>
              <span className="text-sm font-bold text-gold">{formatBRL(pizza.price)}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {pizza.ingredients || pizza.desc}
            </p>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Observações para a Cozinha (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: Sem cebola, massa bem crocante, orégano à parte..."
                maxLength={120}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
          </div>

          {/* 2. Escolha da Borda Recheada */}
          <div className="rounded-2xl border border-border bg-secondary/15 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-gold">
                2. Escolha o Tipo de Borda (Opcional)
              </label>
              {selectedCrust && (
                <span className="text-[11px] font-bold text-gold">
                  {selectedCrust.name}{" "}
                  {selectedCrust.price > 0 ? `(+${formatBRL(selectedCrust.price)})` : "(Grátis)"}
                </span>
              )}
            </div>

            <CrustSelector
              crusts={availableCrusts}
              selectedCrust={selectedCrust}
              onSelect={setSelectedCrust}
            />
          </div>
        </div>

        {/* Sticky Footer com Quantidade e Preço Total */}
        <div className="flex-none border-t border-border bg-secondary/95 backdrop-blur-md p-4 sm:p-5 flex items-center justify-between gap-3">
          <QuantityStepper value={qty} onChange={setQty} />

          {/* Botão de Adicionar ao Pedido */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 rounded-full bg-gold px-4 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95 flex items-center justify-between gap-2"
          >
            <span>Adicionar ao Pedido</span>
            <span className="font-serif font-bold text-sm sm:text-base">
              {formatBRL(totalPrice)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
