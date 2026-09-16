import { useState, useMemo } from "react";
import { X, Search, Plus, Minus, Check, RefreshCw, Sparkles } from "lucide-react";
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
  const [flavor1, setFlavor1] = useState<Pizza>(pizza);
  const [flavor2, setFlavor2] = useState<Pizza | null>(null);
  const [activeSlot, setActiveSlot] = useState<1 | 2>(2); // 1 = escolhendo Metade 1, 2 = escolhendo Metade 2
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCrust, setSelectedCrust] = useState<CrustOption>(CRUST_OPTIONS[0]);
  const [notes1, setNotes1] = useState("");
  const [notes2, setNotes2] = useState("");
  const [notesSingle, setNotesSingle] = useState("");
  const [qty, setQty] = useState(1);

  // Todas as pizzas salgadas e doces disponíveis para escolha
  const allEligiblePizzas = useMemo(() => {
    return allPizzas.filter(
      (p) =>
        p.category === "tradicionais" ||
        p.category === "especiais" ||
        p.category === "doces" ||
        p.category === "doces-especiais"
    );
  }, [allPizzas]);

  // Lista de sabores filtrada para o slot ativo
  const filteredFlavors = useMemo(() => {
    let list = allEligiblePizzas;
    // Não sugerir a mesma pizza já selecionada no outro slot
    if (mode === "meio") {
      if (activeSlot === 1 && flavor2) {
        list = list.filter((p) => p.id !== flavor2.id);
      } else if (activeSlot === 2) {
        list = list.filter((p) => p.id !== flavor1.id);
      }
    }

    if (!searchQuery.trim()) return list;
    const q = cleanString(searchQuery);
    return list.filter(
      (p) => cleanString(p.name).includes(q) || cleanString(p.ingredients).includes(q)
    );
  }, [allEligiblePizzas, mode, activeSlot, flavor1.id, flavor2, searchQuery]);

  // 🧮 REGRA PADRÃO DE MERCADO: max(Preço Sabor 1, Preço Sabor 2) + Preço Borda
  const basePizzaPrice =
    mode === "meio" && flavor2
      ? Math.max(flavor1.price, flavor2.price)
      : flavor1.price;

  const unitPrice = basePizzaPrice + selectedCrust.price;
  const totalPrice = unitPrice * qty;

  const handleSelectFlavor = (p: Pizza) => {
    if (mode === "inteira") {
      setFlavor1(p);
      setSearchQuery("");
      return;
    }

    if (activeSlot === 1) {
      setFlavor1(p);
      setSearchQuery("");
      // Se ainda não escolheu a metade 2, avança automaticamente para o slot 2
      if (!flavor2) {
        setActiveSlot(2);
      }
    } else {
      setFlavor2(p);
      setSearchQuery("");
    }
  };

  const handleConfirm = () => {
    const isHalf = mode === "meio" && !!flavor2;
    const name = isHalf ? `${flavor1.name} / ${flavor2!.name}` : flavor1.name;

    const cartItemId = `${flavor1.id}_${isHalf ? flavor2!.id : "single"}_${selectedCrust.id}_${Date.now()}`;

    const cartItem: CartItem = {
      id: cartItemId,
      pizzaId: flavor1.id,
      name,
      category: flavor1.category,
      isHalf,
      flavor1: {
        id: flavor1.id,
        name: flavor1.name,
        price: flavor1.price,
        notes: isHalf ? notes1.trim() : notesSingle.trim(),
        image: flavor1.image,
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
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Container Responsivo: Bottom Sheet no Mobile / Dialog no Desktop */}
      <div className="relative flex flex-col w-full max-w-lg max-h-[94vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl border border-gold/40 bg-card shadow-2xl overflow-hidden text-foreground">
        
        {/* Header com Imagem e Fechar */}
        <div className="relative flex-none h-36 sm:h-44 w-full overflow-hidden bg-secondary">
          <img
            src={flavor1.image}
            alt={flavor1.name}
            className="w-full h-full object-cover brightness-90 transition-all duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          
          {/* Barra superior de arrasto / indicador de Bottom Sheet no Mobile */}
          <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-white/40" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-md transition hover:bg-gold hover:text-gold-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute bottom-2.5 left-4 right-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-foreground">
                Pizza Grande (8 Fatias)
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                Massa 48h de Fermentação
              </span>
            </div>
            <h2 className="mt-1 font-serif text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {mode === "meio" && flavor2
                ? `${flavor1.name} / ${flavor2.name}`
                : flavor1.name}
            </h2>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {/* 1. Escolha de Modo: 1 Sabor ou Meio a Meio */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gold mb-2">
              1. Quantos sabores você deseja?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("inteira")}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-center transition ${
                  mode === "inteira"
                    ? "border-gold bg-gold/15 text-gold font-bold shadow-gold-glow"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-border/80"
                }`}
              >
                <span className="text-lg">🍕</span>
                <span className="text-xs font-semibold">1 Sabor (Inteira)</span>
                <span className="text-[10px] text-muted-foreground/80">{formatBRL(flavor1.price)}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("meio");
                  if (!flavor2) {
                    setActiveSlot(2);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-center transition ${
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
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gold">Sabor Selecionado</span>
                    <span className="text-xs font-bold text-foreground">{flavor1.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{flavor1.ingredients || flavor1.desc}</p>
                </div>
                <span className="text-sm font-bold text-gold flex-none">{formatBRL(flavor1.price)}</span>
              </div>

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
              
              {/* Metade 1 (Editável e com Troca) */}
              <div
                className={`rounded-2xl border p-3.5 space-y-2.5 transition ${
                  activeSlot === 1
                    ? "border-gold bg-gold/10 shadow-sm"
                    : "border-border bg-secondary/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-foreground">
                      Metade 1 (50%)
                    </span>
                    <span className="font-serif font-bold text-sm text-foreground">{flavor1.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{formatBRL(flavor1.price)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSlot(1);
                        setSearchQuery("");
                      }}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                        activeSlot === 1
                          ? "bg-gold text-gold-foreground shadow"
                          : "border border-gold/40 text-gold hover:bg-gold/20"
                      }`}
                    >
                      <RefreshCw className="h-3 w-3" /> Trocar
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-1">{flavor1.ingredients || flavor1.desc}</p>

                <input
                  type="text"
                  value={notes1}
                  onChange={(e) => setNotes1(e.target.value)}
                  placeholder="Obs. Metade 1 (ex: sem cebola)"
                  maxLength={80}
                  className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              {/* Metade 2 (Editável e com Troca) */}
              <div
                className={`rounded-2xl border p-3.5 space-y-2.5 transition ${
                  activeSlot === 2
                    ? "border-gold bg-gold/10 shadow-sm"
                    : flavor2
                    ? "border-border bg-secondary/20"
                    : "border-dashed border-gold/50 bg-secondary/10"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Metade 2 (50%)
                    </span>
                    <span className="font-serif font-bold text-sm text-foreground">
                      {flavor2 ? flavor2.name : "Escolha o 2º sabor"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {flavor2 && (
                      <span className="text-xs font-semibold text-gold">
                        {flavor2.price > flavor1.price
                          ? `+${formatBRL(flavor2.price - flavor1.price)}`
                          : "Sem acréscimo"}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setActiveSlot(2);
                        setSearchQuery("");
                      }}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                        activeSlot === 2
                          ? "bg-gold text-gold-foreground shadow"
                          : "border border-gold/40 text-gold hover:bg-gold/20"
                      }`}
                    >
                      {flavor2 ? (
                        <>
                          <RefreshCw className="h-3 w-3" /> Trocar
                        </>
                      ) : (
                        "+ Escolher"
                      )}
                    </button>
                  </div>
                </div>

                {flavor2 && (
                  <>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{flavor2.ingredients || flavor2.desc}</p>
                    <input
                      type="text"
                      value={notes2}
                      onChange={(e) => setNotes2(e.target.value)}
                      placeholder={`Obs. Metade 2 (${flavor2.name})`}
                      maxLength={80}
                      className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                  </>
                )}
              </div>

              {/* Seletor Interativo de Sabores com Busca */}
              <div className="rounded-2xl border border-border bg-secondary/15 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Selecione para: <span className="underline">Metade {activeSlot}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {filteredFlavors.length} opções disponíveis
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Buscar sabor para Metade ${activeSlot}...`}
                    className="w-full rounded-xl border border-border bg-card pl-9 pr-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-border/60 bg-card p-1 divide-y divide-border/40">
                  {filteredFlavors.map((f) => {
                    const isSelected = (activeSlot === 1 && flavor1.id === f.id) || (activeSlot === 2 && flavor2?.id === f.id);
                    const baseRefPrice = activeSlot === 2 ? flavor1.price : (flavor2?.price || f.price);
                    const diff = f.price - baseRefPrice;

                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleSelectFlavor(f)}
                        className={`flex w-full items-center justify-between p-2.5 rounded-lg text-left text-xs transition ${
                          isSelected
                            ? "bg-gold/20 text-gold font-bold"
                            : "hover:bg-secondary/60 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 pr-2">
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded-full border flex-none ${
                              isSelected
                                ? "border-gold bg-gold text-gold-foreground"
                                : "border-border"
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{f.name}</span>
                            <span className="text-[10px] text-muted-foreground line-clamp-1">
                              {f.ingredients || f.desc}
                            </span>
                          </div>
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
          )}

          {/* 3. Bordas Recheadas (Radio Cards) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gold mb-2">
              {mode === "meio" ? "3." : "2."} Escolha a Borda Recheada (Opcional)
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
        <div className="flex-none border-t border-border bg-secondary/95 backdrop-blur-md p-3.5 sm:p-4 pb-safe flex items-center justify-between gap-3">
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
            disabled={mode === "meio" && !flavor2}
            className="flex-1 rounded-full bg-gold px-4 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-between gap-2"
          >
            <span>
              {mode === "meio" && !flavor2 ? "Escolha a 2ª Metade" : "Adicionar ao Pedido"}
            </span>
            <span className="font-serif font-bold text-sm sm:text-base">{formatBRL(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
