import { useState } from "react";
import { X, Plus, Minus, Check } from "lucide-react";
import { Pizza, CartItem, CRUST_OPTIONS, CrustOption, formatBRL } from "@/data/catalog";

export function SinglePizzaModal({
  pizza,
  onClose,
  onAddCustomized,
}: {
  pizza: Pizza;
  onClose: () => void;
  onAddCustomized: (item: CartItem) => void;
}) {
  const [selectedCrust, setSelectedCrust] = useState<CrustOption>(CRUST_OPTIONS[0]);
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
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
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
                  {selectedCrust.name} {selectedCrust.price > 0 ? `(+${formatBRL(selectedCrust.price)})` : "(Grátis)"}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {CRUST_OPTIONS.map((crust) => {
                const isSelected = selectedCrust.id === crust.id;
                return (
                  <button
                    key={crust.id}
                    type="button"
                    onClick={() => setSelectedCrust(crust)}
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
                    <span className={`text-[11px] font-bold ${isSelected ? "text-gold" : "text-muted-foreground"}`}>
                      {crust.price === 0 ? "Grátis" : `+${formatBRL(crust.price)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Footer com Quantidade e Preço Total */}
        <div className="flex-none border-t border-border bg-secondary/95 backdrop-blur-md p-4 sm:p-5 flex items-center justify-between gap-3">
          {/* Seletor de Quantidade */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1 flex-none shadow-sm">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="rounded-full p-1 text-foreground transition hover:bg-gold/20 disabled:opacity-30"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-5 text-center text-xs font-bold">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(20, q + 1))}
              className="rounded-full p-1 text-foreground transition hover:bg-gold/20"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Botão de Adicionar ao Pedido */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 rounded-full bg-gold px-4 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95 flex items-center justify-between gap-2"
          >
            <span>Adicionar ao Pedido</span>
            <span className="font-serif font-bold text-sm sm:text-base">{formatBRL(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
