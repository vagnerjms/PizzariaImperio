import { useState, useMemo } from "react";
import { X, Search, Plus, Minus } from "lucide-react";
import { Pizza, CartItem, CRUST_OPTIONS, CrustOption, formatBRL } from "@/data/catalog";
import { cleanString } from "@/lib/delivery-config";

export function PizzaCustomizerModal({
  pizza,
  allPizzas,
  onClose,
  onAddCustomized,
}: {
  pizza: Pizza;
  allPizzas: Pizza[];
  onClose: () => void;
  onAddCustomized: (item: CartItem) => void;
}) {
  const [mode, setMode] = useState<"inteira" | "meio">("inteira");
  const [flavor2, setFlavor2] = useState<Pizza | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCrust, setSelectedCrust] = useState<CrustOption>(CRUST_OPTIONS[0]);
  const [notes1, setNotes1] = useState("");
  const [notes2, setNotes2] = useState("");
  const [notesSingle, setNotesSingle] = useState("");
  const [qty, setQty] = useState(1);

  // Sabores elegíveis para o 2º sabor (Pizzas)
  const eligibleSecondFlavors = useMemo(() => {
    return allPizzas.filter((p) =>
      p.id !== pizza.id && (
        p.category === "tradicionais" ||
        p.category === "especiais" ||
        p.category === "doces" ||
        p.category === "doces-especiais"
      )
    );
  }, [allPizzas, pizza.id]);

  const filteredSecondFlavors = useMemo(() => {
    if (!searchQuery.trim()) return eligibleSecondFlavors;
    const q = cleanString(searchQuery);
    return eligibleSecondFlavors.filter(
      (p) => cleanString(p.name).includes(q) || cleanString(p.ingredients).includes(q)
    );
  }, [eligibleSecondFlavors, searchQuery]);

  // 🧮 REGRA PADRÃO DE MERCADO: max(Preço Sabor 1, Preço Sabor 2) + Preço Borda
  const basePizzaPrice = mode === "meio" && flavor2
    ? Math.max(pizza.price, flavor2.price)
    : pizza.price;

  const unitPrice = basePizzaPrice + selectedCrust.price;
  const totalPrice = unitPrice * qty;

  const handleConfirm = () => {
    const isHalf = mode === "meio" && !!flavor2;
    const name = isHalf
      ? `${pizza.name} / ${flavor2!.name}`
      : pizza.name;

    const cartItemId = `${pizza.id}_${isHalf ? flavor2!.id : "single"}_${selectedCrust.id}_${Date.now()}`;

    const cartItem: CartItem = {
      id: cartItemId,
      pizzaId: pizza.id,
      name,
      category: pizza.category,
      isHalf,
      flavor1: {
        id: pizza.id,
        name: pizza.name,
        price: pizza.price,
        notes: isHalf ? notes1.trim() : notesSingle.trim(),
        image: pizza.image,
      },
      flavor2: isHalf
        ? {
            id: flavor2!.id,
            name: flavor2!.name,
            price: flavor2!.price,
            notes: notes2.trim(),
            image: flavor2!.image,
          }
        : undefined,
      crust: selectedCrust,
      unitPrice,
      quantity: qty,
      totalPrice,
    };

    onAddCustomized(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
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
          
          {/* Barra superior de arrasto / indicador de Bottom Sheet no Mobile */}
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
                Pizza Grande (8 Fatias)
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                Massa 48h de Fermentação
              </span>
            </div>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-foreground">
              {pizza.name}
            </h2>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* 1. Escolha de Modo: 1 Sabor ou Meio a Meio */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gold mb-2.5">
              1. Quantos sabores você deseja?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("inteira")}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3.5 text-center transition ${
                  mode === "inteira"
                    ? "border-gold bg-gold/15 text-gold font-bold shadow-gold-glow"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-border/80"
                }`}
              >
                <span className="text-lg">🍕</span>
                <span className="text-xs font-semibold">1 Sabor (Inteira)</span>
                <span className="text-[10px] text-muted-foreground/80">{formatBRL(pizza.price)}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("meio");
                  if (!flavor2 && eligibleSecondFlavors.length > 0) {
                    setFlavor2(eligibleSecondFlavors[0]);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3.5 text-center transition ${
                  mode === "meio"
                    ? "border-gold bg-gold/15 text-gold font-bold shadow-gold-glow"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-border/80"
                }`}
              >
                <span className="text-lg">🍕🍕</span>
                <span className="text-xs font-semibold">2 Sabores (Meio a Meio)</span>
                <span className="text-[10px] text-muted-foreground/80">Regra do Maior Valor</span>
              </button>
            </div>
          </div>

          {/* 2. Seleção de Sabores */}
          {mode === "inteira" ? (
            <div className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sabor Selecionado</span>
                <span className="text-sm font-bold text-gold">{formatBRL(pizza.price)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{pizza.ingredients || pizza.desc}</p>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Observações para a Pizza (opcional)
                </label>
                <input
                  type="text"
                  value={notesSingle}
                  onChange={(e) => setNotesSingle(e.target.value)}
                  placeholder="Ex.: Sem cebola, massa bem tostada..."
                  maxLength={120}
                  className="w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Metade 1 (Fixada) */}
              <div className="rounded-2xl border border-gold/40 bg-gold/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-foreground">
                      Metade 1 (50%)
                    </span>
                    <span className="font-serif font-bold text-sm text-foreground">{pizza.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">{formatBRL(pizza.price)}</span>
                </div>
                <input
                  type="text"
                  value={notes1}
                  onChange={(e) => setNotes1(e.target.value)}
                  placeholder="Obs. Metade 1 (ex: sem cebola)"
                  maxLength={80}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              {/* Metade 2 (Seletor Interativo) */}
              <div className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Metade 2 (50%)
                    </span>
                    <span className="font-serif font-bold text-sm text-foreground">
                      {flavor2 ? flavor2.name : "Escolha o 2º sabor"}
                    </span>
                  </div>
                  {flavor2 && (
                    <span className="text-xs font-semibold text-gold">
                      {flavor2.price > pizza.price
                        ? `+${formatBRL(flavor2.price - pizza.price)}`
                        : "Sem acréscimo"}
                    </span>
                  )}
                </div>

                {flavor2 && (
                  <input
                    type="text"
                    value={notes2}
                    onChange={(e) => setNotes2(e.target.value)}
                    placeholder={`Obs. Metade 2 (${flavor2.name})`}
                    maxLength={80}
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                )}

                {/* Busca e Lista do 2º Sabor */}
                <div className="pt-2">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar 2º sabor no cardápio..."
                      className="w-full rounded-xl border border-border bg-card pl-9 pr-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-border/60 bg-card p-1.5 divide-y divide-border/40">
                    {filteredSecondFlavors.map((f) => {
                      const isSelected = flavor2?.id === f.id;
                      const diff = f.price - pizza.price;

                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFlavor2(f)}
                          className={`flex w-full items-center justify-between p-2.5 rounded-lg text-left text-xs transition ${
                            isSelected
                              ? "bg-gold/20 text-gold font-bold"
                              : "hover:bg-secondary/60 text-foreground"
                          }`}
                        >
                          <div className="flex flex-col pr-2">
                            <span className="font-semibold text-foreground">{f.name}</span>
                            <span className="text-[10px] text-muted-foreground line-clamp-1">
                              {f.ingredients}
                            </span>
                          </div>
                          <div className="flex flex-col items-end flex-none">
                            <span className="text-[11px] font-bold text-gold">
                              {diff > 0 ? `+${formatBRL(diff)}` : "Sem acréscimo"}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {formatBRL(f.price)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Bordas Recheadas (Radio Cards) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gold mb-2.5">
              2. Escolha a Borda Recheada (Opcional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CRUST_OPTIONS.map((crust) => {
                const isSelected = selectedCrust.id === crust.id;
                return (
                  <button
                    key={crust.id}
                    type="button"
                    onClick={() => setSelectedCrust(crust)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs text-left transition ${
                      isSelected
                        ? "border-gold bg-gold/15 text-gold font-bold shadow-gold-glow"
                        : "border-border bg-secondary/30 text-foreground hover:border-border/80"
                    }`}
                  >
                    <span>{crust.name}</span>
                    <span className={`text-[11px] font-bold ${isSelected ? "text-gold" : "text-muted-foreground"}`}>
                      {crust.price === 0 ? "Grátis" : `+${formatBRL(crust.price)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Sticky Footer com Quantidade e Preço Recalculado */}
        <div className="flex-none border-t border-border bg-secondary/90 backdrop-blur-md p-4 sm:p-5 flex items-center justify-between gap-3">
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

          {/* Botão de Adicionar com Preço Total */}
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
