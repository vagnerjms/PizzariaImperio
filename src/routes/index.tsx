import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPublicPromotions } from "@/lib/promotions.functions";
import { getPublicCatalog } from "@/lib/menu.functions";
import { PublicCatalogResponse } from "@/lib/menu-domain";
import { getPublicStoreConfig } from "@/lib/settings";
import { PublicStoreConfig } from "@/lib/store-hours";
import { initTrackingPixels } from "@/lib/analytics";
import { Promotion } from "@/lib/promotions.types";
import { MENU, CATEGORIES, Pizza, CartItem, CRUST_OPTIONS, formatBRL } from "@/data/catalog";
import { useCart } from "@/hooks/useCart";
import { Header } from "@/components/home/Header";
import { Hero } from "@/components/home/Hero";
import { Promocoes } from "@/components/home/Promocoes";
import { Menu } from "@/components/home/Menu";
import { SinglePizzaModal } from "@/components/home/SinglePizzaModal";
import { HalfAndHalfModal } from "@/components/home/HalfAndHalfModal";
import { Story } from "@/components/home/Story";
import { Contact } from "@/components/home/Contact";
import { Footer } from "@/components/home/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      const [promos, catalog, storeConfig] = await Promise.all([
        getPublicPromotions(),
        getPublicCatalog(),
        getPublicStoreConfig(),
      ]);
      return {
        promotions: promos || [],
        catalog: (catalog || null) as PublicCatalogResponse | null,
        storeConfig: (storeConfig || null) as PublicStoreConfig | null,
      };
    } catch {
      return {
        promotions: [],
        catalog: null as PublicCatalogResponse | null,
        storeConfig: null as PublicStoreConfig | null,
      };
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

  // Estado independente para os modais de 1 Sabor e Meio a Meio
  const [singlePizzaModal, setSinglePizzaModal] = useState<Pizza | null>(null);
  const [halfAndHalfModalOpen, setHalfAndHalfModalOpen] = useState(false);
  const [halfAndHalfInitialFlavor, setHalfAndHalfInitialFlavor] = useState<Pizza | null>(null);

  const fetchPromotions = useServerFn(getPublicPromotions);
  const fetchCatalog = useServerFn(getPublicCatalog);
  const fetchStoreConfig = useServerFn(getPublicStoreConfig);
  const [promotions, setPromotions] = useState<Promotion[]>(() => loaderData?.promotions || []);
  const [catalog, setCatalog] = useState<PublicCatalogResponse | null>(
    () => loaderData?.catalog || null
  );
  const [storeConfig, setStoreConfig] = useState<PublicStoreConfig | null>(
    () => loaderData?.storeConfig || null
  );

  useEffect(() => {
    fetchPromotions()
      .then((data) => {
        if (data && Array.isArray(data)) setPromotions(data);
      })
      .catch((err) => console.error("Erro ao carregar promoções públicas:", err));

    fetchCatalog()
      .then((data) => {
        if (data?.items) setCatalog(data);
      })
      .catch((err) => console.error("Erro ao carregar catálogo dinâmico:", err));

    fetchStoreConfig()
      .then((data) => {
        if (data) setStoreConfig(data);
      })
      .catch((err) => console.error("Erro ao carregar configurações da loja:", err));
  }, []);

  // Inicializa Meta Pixel & GA4 quando configurados pelo admin
  useEffect(() => {
    if (storeConfig) {
      initTrackingPixels({
        meta_pixel_id: storeConfig.meta_pixel_id,
        ga4_measurement_id: storeConfig.ga4_measurement_id,
      });
    }
  }, [storeConfig?.meta_pixel_id, storeConfig?.ga4_measurement_id]);

  const effectiveMenu = useMemo<Pizza[]>(() => {
    const source = catalog?.items && catalog.items.length > 0 ? catalog.items : MENU;
    return source.filter((item) => item.available !== false);
  }, [catalog]);

  const effectiveCrusts = useMemo(() => {
    const source =
      catalog?.crusts && catalog.crusts.length > 0
        ? catalog.crusts.filter((c) => c.available !== false)
        : CRUST_OPTIONS;
    return source.length > 0 ? source : CRUST_OPTIONS;
  }, [catalog]);

  const effectiveMenuById = useMemo(
    () => Object.fromEntries(effectiveMenu.map((p) => [p.id, p])),
    [effectiveMenu]
  );

  const {
    cart,
    cartCount,
    discount,
    total,
    appliedPromotion,
    couponCode,
    couponFeedback,
    handleApplyCoupon,
    handleClearCoupon,
    cartOpen,
    justAdded,
    handleAddCustomizedToCart,
    handleIncCartItem,
    handleDecCartItem,
    handleRemoveCartItem,
    handleClearCart,
    handleOpenCart,
    handleCloseCart,
  } = useCart(promotions, effectiveMenuById);

  const filtered = useMemo(
    () => (cat === "todas" ? effectiveMenu : effectiveMenu.filter((p) => p.category === cat)),
    [cat, effectiveMenu]
  );

  // 1. Clique em Pizza Individual (1 Sabor Inteira ou Bebida)
  const handleAddSingle = (p: Pizza) => {
    if (!p) return;

    if (
      p.category === "tradicionais" ||
      p.category === "especiais" ||
      p.category === "doces" ||
      p.category === "doces-especiais"
    ) {
      setSinglePizzaModal(p);
      return;
    }

    // Bebidas ou outros itens simples
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
      crust: effectiveCrusts[0] || CRUST_OPTIONS[0],
      unitPrice: p.price,
      quantity: 1,
      totalPrice: p.price,
    };
    handleAddCustomizedToCart(simpleItem);
    handleOpenCart();
  };

  // 2. Clique no Card/Banner de 2 Sabores (Meio a Meio)
  const handleOpenHalfAndHalf = (initialFlavor?: Pizza) => {
    setHalfAndHalfInitialFlavor(initialFlavor || null);
    setHalfAndHalfModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        cartCount={cartCount}
        pulse={justAdded}
        onOpenCart={handleOpenCart}
        storeOpen={storeConfig?.status?.isOpen ?? true}
        storeStatusReason={storeConfig?.status?.reason}
      />
      <Hero />
      <Promocoes
        promotions={promotions}
        onAdd={(pizzaId) => {
          const p = effectiveMenuById[pizzaId];
          if (p) handleAddSingle(p);
        }}
        onUseCoupon={(code) => {
          if (cart.length > 0) {
            handleApplyCoupon(code);
            handleOpenCart();
          }
        }}
      />
      <Menu
        items={filtered}
        category={cat}
        onCategory={setCat}
        onAddSingle={handleAddSingle}
        onOpenHalfAndHalf={() => handleOpenHalfAndHalf()}
      />
      <Story />
      <Contact storePhone={storeConfig?.store_phone} />
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
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Total do carrinho
              </span>
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

      {/* 1. Modal Exclusivo de 1 Sabor (Pizza Inteira) */}
      {singlePizzaModal && (
        <SinglePizzaModal
          pizza={singlePizzaModal}
          crustOptions={effectiveCrusts}
          onClose={() => setSinglePizzaModal(null)}
          onAddCustomized={(item) => {
            handleAddCustomizedToCart(item);
            handleOpenCart();
          }}
        />
      )}

      {/* 2. Modal Exclusivo de 2 Sabores (Meio a Meio) */}
      {halfAndHalfModalOpen && (
        <HalfAndHalfModal
          allPizzas={effectiveMenu}
          initialFlavor1={halfAndHalfInitialFlavor}
          crustOptions={effectiveCrusts}
          onClose={() => {
            setHalfAndHalfModalOpen(false);
            setHalfAndHalfInitialFlavor(null);
          }}
          onAddCustomized={(item) => {
            handleAddCustomizedToCart(item);
            handleOpenCart();
          }}
        />
      )}

      <CartDrawer
        open={cartOpen}
        onClose={handleCloseCart}
        onOpen={handleOpenCart}
        cart={cart}
        appliedPromotion={appliedPromotion}
        couponCode={couponCode}
        couponFeedback={couponFeedback}
        onApplyCoupon={handleApplyCoupon}
        onClearCoupon={handleClearCoupon}
        storeConfig={storeConfig}
        onInc={handleIncCartItem}
        onDec={handleDecCartItem}
        onRemove={handleRemoveCartItem}
        onClear={handleClearCart}
      />
    </div>
  );
}
