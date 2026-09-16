import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPublicPromotions } from "@/lib/promotions.functions";
import { Promotion } from "@/lib/promotions.types";
import { MENU, MENU_BY_ID, CATEGORIES, Pizza, CartItem, CRUST_OPTIONS, formatBRL } from "@/data/catalog";
import { useCart } from "@/hooks/useCart";
import { Header } from "@/components/home/Header";
import { Hero } from "@/components/home/Hero";
import { Promocoes } from "@/components/home/Promocoes";
import { Menu } from "@/components/home/Menu";
import { PizzaCustomizerModal } from "@/components/home/PizzaCustomizerModal";
import { Story } from "@/components/home/Story";
import { Contact } from "@/components/home/Contact";
import { Footer } from "@/components/home/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      const { listPublicPromotionsFromDb } = await import("@/lib/promotions.server");
      const promos = await listPublicPromotionsFromDb();
      return { promotions: promos || [] };
    } catch {
      return { promotions: [] };
    }
  },
  head: () => ({
    meta: [
      { title: "Pizzaria Império — Forno a Lenha · São Paulo & Bragança" },
      {
        name: "description",
        content:
          "Pizzaria Império: massa de fermentação natural de 48h, forno a lenha a 400°C e ingredientes selecionados.",
      },
      { property: "og:title", content: "Pizzaria Império — Forno a Lenha" },
      {
        property: "og:description",
        content:
          "O sabor de um verdadeiro império. Massa de 48h, forno a lenha e ingredientes selecionados.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Home,
});

function Home() {
  const loaderData = Route.useLoaderData();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]["id"]>("todas");
  const [customizingPizza, setCustomizingPizza] = useState<Pizza | null>(null);

  const fetchPromotions = useServerFn(getPublicPromotions);
  const [promotions, setPromotions] = useState<Promotion[]>(() => loaderData?.promotions || []);

  useEffect(() => {
    fetchPromotions()
      .then((data) => {
        if (data && Array.isArray(data)) setPromotions(data);
      })
      .catch((err) => console.error("Erro ao carregar promoções públicas:", err));
  }, []);

  const {
    cart,
    cartCount,
    subtotal,
    discount,
    total,
    appliedPromotion,
    cartOpen,
    justAdded,
    handleAddCustomizedToCart,
    handleIncCartItem,
    handleDecCartItem,
    handleRemoveCartItem,
    handleClearCart,
    handleOpenCart,
    handleCloseCart,
  } = useCart(promotions);

  const filtered = useMemo(
    () => (cat === "todas" ? MENU : MENU.filter((p) => p.category === cat)),
    [cat],
  );

  // Clique no cardápio: Abre modal para pizzas grandes ou adiciona direto brotos/bebidas
  const handleMenuItemClick = (pizzaId: string) => {
    const p = MENU_BY_ID[pizzaId];
    if (!p) return;

    if (
      p.category === "tradicionais" ||
      p.category === "especiais" ||
      p.category === "doces" ||
      p.category === "doces-especiais"
    ) {
      setCustomizingPizza(p);
      return;
    }

    const simpleItem: CartItem = {
      id: `${p.id}_${Date.now()}`,
      pizzaId: p.id,
      name: p.name,
      category: p.category,
      isHalf: false,
      flavor1: {
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
      },
      crust: CRUST_OPTIONS[0],
      unitPrice: p.price,
      quantity: 1,
      totalPrice: p.price,
    };
    handleAddCustomizedToCart(simpleItem);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header cartCount={cartCount} pulse={justAdded} onOpenCart={handleOpenCart} />
      <Hero />
      <Promocoes promotions={promotions} onAdd={handleMenuItemClick} />
      <Menu
        items={filtered}
        category={cat}
        onCategory={setCat}
        onAdd={handleMenuItemClick}
      />
      <Story />
      <Contact />
      <Footer />

      {cartCount > 0 && !cartOpen && (
        <>
          {/* Desktop Floating Button */}
          <button
            type="button"
            onClick={handleOpenCart}
            className="hidden md:inline-flex fixed bottom-6 right-6 z-40 items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-gold-foreground shadow-gold-glow transition hover:brightness-110"
          >
            <ShoppingBag className="h-4 w-4" />
            Ver carrinho · {cartCount}
          </button>
          
          {/* Mobile Sticky Bottom Bar */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-secondary/95 backdrop-blur-md border-t border-border/40 p-4 pb-safe flex items-center justify-between shadow-2xl">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total do carrinho</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gold font-serif font-bold text-lg">{formatBRL(total)}</span>
                {discount > 0 && (
                  <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                    -{formatBRL(discount)}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenCart}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-gold-foreground transition hover:brightness-110 active:scale-95"
            >
              <ShoppingBag className="h-4 w-4" />
              Ver Carrinho ({cartCount})
            </button>
          </div>
        </>
      )}

      {/* Modal de Personalização e Meio a Meio */}
      {customizingPizza && (
        <PizzaCustomizerModal
          pizza={customizingPizza}
          allPizzas={MENU}
          onClose={() => setCustomizingPizza(null)}
          onAddCustomized={handleAddCustomizedToCart}
        />
      )}

      <CartDrawer
        open={cartOpen}
        onClose={handleCloseCart}
        onOpen={handleOpenCart}
        cart={cart}
        appliedPromotion={appliedPromotion}
        onInc={handleIncCartItem}
        onDec={handleDecCartItem}
        onRemove={handleRemoveCartItem}
        onClear={handleClearCart}
      />
    </div>
  );
}
