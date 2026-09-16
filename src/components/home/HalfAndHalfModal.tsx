import { useState, useMemo, useRef, useEffect } from "react";
import { X, Search, Plus, Minus, Check, RefreshCw, Sparkles, ChevronRight } from "lucide-react";
import { Pizza, CartItem, CRUST_OPTIONS, CrustOption, formatBRL } from "@/data/catalog";
import { cleanString } from "@/lib/delivery-config";

export function HalfAndHalfModal({
  allPizzas,
  initialFlavor1,
  onClose,
  onAddCustomized,
}: {
  allPizzas: Pizza[];
  initialFlavor1?: Pizza | null;
  onClose: () => void;
  onAddCustomized: (item: CartItem) => void;
}) {
  // Sabores elegíveis (Pizzas salgadas e doces)
  const eligiblePizzas = useMemo(() => {
    return allPizzas.filter(
      (p) =>
        p.category === "tradicionais" ||
        p.category === "especiais" ||
        p.category === "doces" ||
        p.category === "doces-especiais"
    );
  }, [allPizzas]);

  // Estados dos passos: 1 = Escolhendo Metade 1, 2 = Escolhendo Metade 2, 3 = Escolhendo Borda / Revisão
  const [flavor1, setFlavor1] = useState<Pizza | null>(initialFlavor1 || null);
  const [flavor2, setFlavor2] = useState<Pizza | null>(null);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(initialFlavor1 ? 2 : 1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCrust, setSelectedCrust] = useState<CrustOption>(CRUST_OPTIONS[0]);
  const [notes1, setNotes1] = useState("");
  const [notes2, setNotes2] = useState("");
  const [qty, setQty] = useState(1);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const crustSectionRef = useRef<HTMLDivElement>(null);

  // Imagem de fallback caso ainda não tenha sabor selecionado
  const defaultPlaceholderImg = eligiblePizzas[0]?.image || "/placeholder.svg";

  // Lista de sabores filtrada para a metade ativa
  const filteredFlavors = useMemo(() => {
    let list = eligiblePizzas;
    if (activeStep === 1 && flavor2) {
      list = list.filter((p) => p.id !== flavor2.id);
    } else if (activeStep === 2 && flavor1) {
      list = list.filter((p) => p.id !== flavor1.id);
    }

    if (!searchQuery.trim()) return list;
    const q = cleanString(searchQuery);
    return list.filter(
      (p) => cleanString(p.name).includes(q) || cleanString(p.ingredients || "").includes(q)
    );
  }, [eligiblePizzas, activeStep, flavor1, flavor2, searchQuery]);

  // 🧮 REGRA PADRÃO DE MERCADO: max(Preço Sabor 1, Preço Sabor 2) + Preço Borda
  const basePizzaPrice =
    flavor1 && flavor2
      ? Math.max(flavor1.price, flavor2.price)
      : flavor1
      ? flavor1.price
      : flavor2
      ? flavor2.price
      : 0;

  const unitPrice = basePizzaPrice + (basePizzaPrice > 0 ? selectedCrust.price : 0);
  const totalPrice = unitPrice * qty;

  // Seleção guiada de sabor
  const handleSelectFlavor = (p: Pizza) => {
    if (activeStep === 1) {
      setFlavor1(p);
      setSearchQuery("");
      if (!flavor2) {
        setActiveStep(2);
      } else {
        setActiveStep(3);
      }
    } else if (activeStep === 2) {
      setFlavor2(p);
      setSearchQuery("");
      setActiveStep(3);
    }
  };

  // Scroll suave para a seção de borda quando chega no Passo 3
  useEffect(() => {
    if (activeStep === 3 && crustSectionRef.current) {
      crustSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeStep]);

  const handleConfirm = () => {
    if (!flavor1 || !flavor2) return;

    const cartItemId = `${flavor1.id}_${flavor2.id}_${selectedCrust.id}_${Date.now()}`;

    const cartItem: CartItem = {
      id: cartItemId,
      pizzaId: flavor1.id,
      name: `${flavor1.name} / ${flavor2.name}`,
      category: flavor1.category,
      isHalf: true,
      flavor1: {
        id: flavor1.id,
        name: flavor1.name,
        price: flavor1.price,
        notes: notes1.trim(),
        image: flavor1.image,
      },
      flavor2: {
        id: flavor2.id,
        name: flavor2.name,
        price: flavor2.price,
        notes: notes2.trim(),
        image: flavor2.image,
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
      {/* Container Responsivo */}
      <div className="relative flex flex-col w-full max-w-lg max-h-[94vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl border border-gold/40 bg-card shadow-2xl overflow-hidden text-foreground">
        
        {/* Header Visual Dividido */}
        <div className="relative flex-none h-32 sm:h-36 w-full overflow-hidden bg-secondary">
          <div className="flex h-full w-full">
            <div className="w-1/2 h-full overflow-hidden relative">
              <img
                src={flavor1 ? flavor1.image : defaultPlaceholderImg}
                alt={flavor1?.name || "Metade 1"}
                className={`w-full h-full object-cover transition-all duration-300 ${
                  flavor1 ? "brightness-90" : "brightness-40 grayscale opacity-60"
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
              {!flavor1 && (
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white/70 uppercase tracking-wider">
                  Metade 1
                </div>
              )}
            </div>
            <div className="w-1/2 h-full overflow-hidden relative border-l border-gold/40">
              <img
                src={flavor2 ? flavor2.image : defaultPlaceholderImg}
                alt={flavor2?.name || "Metade 2"}
                className={`w-full h-full object-cover transition-all duration-300 ${
                  flavor2 ? "brightness-90" : "brightness-40 grayscale opacity-60"
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
              {!flavor2 && (
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white/70 uppercase tracking-wider">
                  Metade 2
                </div>
              )}
            </div>
          </div>

          {/* Barra superior de arrasto no Mobile */}
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
              <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 fill-gold-foreground" /> 2 Sabores (Meio a Meio)
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Regra do Maior Valor
              </span>
            </div>
            <h2 className="mt-1 font-serif text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
              {flavor1 && flavor2
                ? `${flavor1.name} / ${flavor2.name}`
                : flavor1
                ? `${flavor1.name} / (Escolha a 2ª metade)`
                : flavor2
                ? `(Escolha a 1ª metade) / ${flavor2.name}`
                : "Monte sua Pizza com 2 Sabores"}
            </h2>
          </div>
        </div>

        {/* 🧭 Barra de Etapas Guiadas (Step Indicator) */}
        <div className="flex-none bg-secondary/70 border-b border-border/60 px-4 py-2 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveStep(1);
              setSearchQuery("");
            }}
            className={`flex items-center gap-1 font-bold transition ${
              activeStep === 1
                ? "text-gold underline"
                : flavor1
                ? "text-foreground hover:text-gold"
                : "text-muted-foreground"
            }`}
          >
            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
              flavor1 ? "bg-green-500 text-white" : activeStep === 1 ? "bg-gold text-gold-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {flavor1 ? "✓" : "1"}
            </span>
            <span>1ª Metade</span>
          </button>

          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 flex-none" />

          <button
            type="button"
            onClick={() => {
              if (flavor1) {
                setActiveStep(2);
                setSearchQuery("");
              }
            }}
            className={`flex items-center gap-1 font-bold transition ${
              activeStep === 2
                ? "text-gold underline"
                : flavor2
                ? "text-foreground hover:text-gold"
                : "text-muted-foreground"
            }`}
          >
            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
              flavor2 ? "bg-green-500 text-white" : activeStep === 2 ? "bg-gold text-gold-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {flavor2 ? "✓" : "2"}
            </span>
            <span>2ª Metade</span>
          </button>

          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 flex-none" />

          <button
            type="button"
            onClick={() => {
              if (flavor1 && flavor2) {
                setActiveStep(3);
              }
            }}
            className={`flex items-center gap-1 font-bold transition ${
              activeStep === 3
                ? "text-gold underline"
                : flavor1 && flavor2
                ? "text-foreground hover:text-gold"
                : "text-muted-foreground"
            }`}
          >
            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
              flavor1 && flavor2 && selectedCrust ? "bg-green-500 text-white" : activeStep === 3 ? "bg-gold text-gold-foreground" : "bg-muted text-muted-foreground"
            }`}>
              3
            </span>
            <span>Borda & Finalizar</span>
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Card da Metade 1 */}
          <div
            className={`rounded-2xl border p-3.5 space-y-2.5 transition ${
              activeStep === 1
                ? "border-gold bg-gold/10 shadow-sm ring-2 ring-gold/40"
                : flavor1
                ? "border-border bg-secondary/20"
                : "border-dashed border-gold/50 bg-secondary/10"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  activeStep === 1 ? "bg-gold text-gold-foreground" : "bg-secondary text-muted-foreground border border-border"
                }`}>
                  1. Metade 1 (50%)
                </span>
                <span className="font-serif font-bold text-sm text-foreground">
                  {flavor1 ? flavor1.name : "Escolha o 1º sabor"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {flavor1 && (
                  <span className="text-xs font-semibold text-muted-foreground">{formatBRL(flavor1.price)}</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep(1);
                    setSearchQuery("");
                  }}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                    activeStep === 1
                      ? "bg-gold text-gold-foreground shadow"
                      : "border border-gold/40 text-gold hover:bg-gold/20"
                  }`}
                >
                  {flavor1 ? (
                    <>
                      <RefreshCw className="h-3 w-3" /> Trocar
                    </>
                  ) : (
                    "+ Escolher"
                  )}
                </button>
              </div>
            </div>

            {flavor1 && (
              <>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{flavor1.ingredients || flavor1.desc}</p>
                <input
                  type="text"
                  value={notes1}
                  onChange={(e) => setNotes1(e.target.value)}
                  placeholder="Obs. Metade 1 (ex: sem cebola, bem tostada)"
                  maxLength={80}
                  className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </>
            )}
          </div>

          {/* Card da Metade 2 */}
          <div
            className={`rounded-2xl border p-3.5 space-y-2.5 transition ${
              activeStep === 2
                ? "border-gold bg-gold/10 shadow-sm ring-2 ring-gold/40"
                : flavor2
                ? "border-border bg-secondary/20"
                : "border-dashed border-gold/50 bg-secondary/10"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  activeStep === 2 ? "bg-gold text-gold-foreground" : "bg-secondary text-muted-foreground border border-border"
                }`}>
                  2. Metade 2 (50%)
                </span>
                <span className="font-serif font-bold text-sm text-foreground">
                  {flavor2 ? flavor2.name : "Escolha o 2º sabor"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {flavor1 && flavor2 && (
                  <span className="text-xs font-semibold text-gold">
                    {flavor2.price > flavor1.price
                      ? `+${formatBRL(flavor2.price - flavor1.price)}`
                      : "Sem acréscimo"}
                  </span>
                )}
                {!flavor1 && flavor2 && (
                  <span className="text-xs font-semibold text-muted-foreground">{formatBRL(flavor2.price)}</span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveStep(2);
                    setSearchQuery("");
                  }}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                    activeStep === 2
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

          {/* Bandeja de Seleção do Sabor para a Metade Ativa (Passo 1 ou Passo 2) */}
          {(activeStep === 1 || activeStep === 2) && (
            <div className="rounded-2xl border-2 border-gold/50 bg-secondary/15 p-3.5 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Passo {activeStep}: <span className="underline font-black">Escolha a {activeStep}ª Metade</span>
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
                  placeholder={`Buscar sabor para a ${activeStep}ª Metade...`}
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
                  const isSelected =
                    (activeStep === 1 && flavor1?.id === f.id) ||
                    (activeStep === 2 && flavor2?.id === f.id);
                  const baseRefPrice =
                    activeStep === 2 && flavor1
                      ? flavor1.price
                      : activeStep === 1 && flavor2
                      ? flavor2.price
                      : f.price;
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
                          {activeStep === 2 && flavor1
                            ? diff > 0
                              ? `+${formatBRL(diff)}`
                              : "Sem acréscimo"
                            : formatBRL(f.price)}
                        </span>
                        {activeStep === 2 && flavor1 && (
                          <span className="text-[9px] text-muted-foreground">
                            {formatBRL(f.price)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Escolha da Borda Recheada (Passo 3 Guiado) */}
          <div
            ref={crustSectionRef}
            className={`rounded-2xl border p-3.5 space-y-2.5 transition ${
              activeStep === 3
                ? "border-gold bg-gold/10 shadow-sm ring-2 ring-gold/40"
                : "border-border bg-secondary/15"
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  activeStep === 3 ? "bg-gold text-gold-foreground" : "bg-secondary text-muted-foreground border border-border"
                }`}>
                  3. Borda Recheada
                </span>
                <span>Escolha o Tipo de Borda (Opcional)</span>
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
                    onClick={() => {
                      setSelectedCrust(crust);
                      setActiveStep(3);
                    }}
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

        {/* Sticky Footer com Guia de Ação */}
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

          {/* Botão de Adicionar Guiado */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!flavor1 || !flavor2}
            className="flex-1 rounded-full bg-gold px-4 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-between gap-2"
          >
            <span>
              {!flavor1
                ? "1️⃣ Passo 1: Escolha a 1ª Metade"
                : !flavor2
                ? "2️⃣ Passo 2: Escolha a 2ª Metade"
                : "✅ Adicionar ao Pedido"}
            </span>
            <span className="font-serif font-bold text-sm sm:text-base">
              {flavor1 && flavor2 ? formatBRL(totalPrice) : "--"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
