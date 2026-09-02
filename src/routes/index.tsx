import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createOrder, getOrderStatus } from "@/lib/orders.functions";
import { getDeliveryFeeForNeighborhood, cleanString } from "@/lib/delivery-config";
import { getPublicDeliveryConfig } from "@/lib/delivery.functions";
import { getPublicPromotions } from "@/lib/promotions.functions";
import { evaluateCartPromotions } from "@/lib/promotions-engine";
import { Promotion, AppliedPromotionResult } from "@/lib/promotions.types";
import {
  Flame,
  Truck,
  Clock,
  ShoppingBag,
  Phone,
  MapPin,
  Star,
  Plus,
  Minus,
  Trash2,
  X,
  Instagram,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Sparkles,
  Tag,
  Gift,
  Navigation,
  Search,
  Compass,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";
import { reverseGeocodeGPS, searchStreetAddress, LocationResult } from "@/lib/location.functions";
import heroForno from "@/assets/hero-forno.jpg";
import pizzaiolo from "@/assets/pizzaiolo.jpg";
import logo from "@/assets/logo.png";
import margheritaImage from "@/assets/menu/margherita.jpg";
import pepperoniImage from "@/assets/menu/pepperoni.jpg";
import quatroQueijosImage from "@/assets/menu/quatro-queijos.jpg";
import calabresaImage from "@/assets/menu/calabresa.jpg";
import portuguesaImage from "@/assets/menu/portuguesa.jpg";
import frangoCatupiryImage from "@/assets/menu/frango-catupiry.jpg";
import vegetarianaImage from "@/assets/menu/vegetariana.jpg";
import romeuJulietaImage from "@/assets/menu/romeu-julieta.jpg";
import chocolateMorangoImage from "@/assets/menu/chocolate-morango.jpg";
import cocaImage from "@/assets/menu/coca-2l.jpg";
import guaranaImage from "@/assets/menu/guarana-2l.jpg";
import aguaImage from "@/assets/menu/agua.jpg";

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

export type Category =
  | "tradicionais"
  | "especiais"
  | "doces"
  | "doces-especiais"
  | "brotos"
  | "bebidas"
  | "adicionais";

export type Pizza = {
  id: string;
  name: string;
  desc: string;
  ingredients: string;
  price: number;
  image: string;
  badge?: string;
  category: Category;
};

// Imagens de referência reutilizadas por categoria
const IMG = {
  mussarela: margheritaImage,
  tomate: margheritaImage,
  calabresa: calabresaImage,
  portuguesa: portuguesaImage,
  frango: frangoCatupiryImage,
  queijos: quatroQueijosImage,
  pepperoni: pepperoniImage,
  vegetariana: vegetarianaImage,
  romeu: romeuJulietaImage,
  chocolate: chocolateMorangoImage,
  coca: cocaImage,
  guarana: guaranaImage,
  agua: aguaImage,
};

const p = (
  id: string,
  name: string,
  ingredients: string,
  price: number,
  image: string,
  category: Category,
  badge?: string,
): Pizza => ({ id, name, desc: ingredients || name, ingredients, price, image, category, badge });

export const MENU: Pizza[] = [
  // ===== TRADICIONAIS =====
  p("abobrinha", "Abobrinha", "Abobrinha, mussarela, parmesão e alho", 48, IMG.vegetariana, "tradicionais"),
  p("alho", "Alho", "Alho e mussarela", 48, IMG.mussarela, "tradicionais"),
  p("atum", "Atum", "Atum e cebola", 48, IMG.portuguesa, "tradicionais"),
  p("bacon", "Bacon", "Bacon e mussarela", 48, IMG.calabresa, "tradicionais"),
  p("baianinha", "Baianinha", "Calabresa, cebola, molho de pimenta e parmesão", 48, IMG.calabresa, "tradicionais"),
  p("bauru", "Bauru", "Presunto, tomate e mussarela", 46, IMG.portuguesa, "tradicionais"),
  p("bragantina", "Bragantina", "Linguiça, calabresa e cebola", 50, IMG.calabresa, "tradicionais"),
  p("brasileira", "Brasileira", "Presunto, mussarela e bacon", 48, IMG.portuguesa, "tradicionais"),
  p("brocolis", "Brócolis", "Brócolis, mussarela, bacon e alho frito", 48, IMG.vegetariana, "tradicionais"),
  p("calabresa", "Calabresa", "Calabresa, cebola e mussarela", 48, IMG.calabresa, "tradicionais", "Mais pedida"),
  p("calabria", "Calábria", "Calabresa, cebola e catupiry", 48, IMG.calabresa, "tradicionais"),
  p("caicara", "Caiçara", "Atum, palmito e mussarela", 46, IMG.portuguesa, "tradicionais"),
  p("carijo", "Carijó", "Frango, milho, catupiry e bacon", 48, IMG.frango, "tradicionais"),
  p("do-chef", "Do Chef", "Calabresa, presunto, catupiry e mussarela", 50, IMG.calabresa, "tradicionais"),
  p("elite", "Elite", "Frango, palmito, ervilha, milho, mussarela e catupiry", 48, IMG.frango, "tradicionais"),
  p("escarola", "Escarola", "Escarola refogada no alho e óleo, mussarela e bacon", 48, IMG.vegetariana, "tradicionais"),
  p("francesa", "Francesa", "Mussarela, palmito e cheddar", 48, IMG.queijos, "tradicionais"),
  p("frango-mussarela", "Frango Mussarela", "Frango e mussarela", 46, IMG.frango, "tradicionais"),
  p("frango-catupiry", "Frango com Catupiry", "Frango e catupiry", 46, IMG.frango, "tradicionais", "Mais pedida"),
  p("frango-bicolor", "Frango Bicolor", "Frango, catupiry e cheddar", 48, IMG.frango, "tradicionais"),
  p("frango-cheddar", "Frango e Cheddar", "Frango e cheddar", 48, IMG.frango, "tradicionais"),
  p("imperio", "Império", "Mussarela, palmito, milho e ervilha", 48, IMG.vegetariana, "tradicionais"),
  p("jardineira", "Jardineira", "Presunto, ovos, mussarela, ervilha e cheddar", 48, IMG.portuguesa, "tradicionais"),
  p("lombo", "Lombo", "Lombo, cebola e mussarela", 48, IMG.portuguesa, "tradicionais"),
  p("marguerita", "Marguerita", "Mussarela, tomate e manjericão", 46, IMG.mussarela, "tradicionais"),
  p("milho", "Milho", "Milho e mussarela", 46, IMG.mussarela, "tradicionais"),
  p("mussarela", "Mussarela", "Mussarela e orégano", 46, IMG.mussarela, "tradicionais"),
  p("napolitana", "Napolitana", "Mussarela, tomate e parmesão", 48, IMG.mussarela, "tradicionais"),
  p("palmito", "Palmito", "Palmito e mussarela", 48, IMG.vegetariana, "tradicionais"),
  p("paulista", "Paulista", "Frango, ovos, mussarela, cebola e catupiry", 48, IMG.frango, "tradicionais"),
  p("picardia", "Picardia", "Frango, ovos, cebola, mussarela e molho de pimenta", 48, IMG.frango, "tradicionais"),
  p("portuguesa", "Portuguesa", "Presunto, ovos, cebola, mussarela e ervilha", 50, IMG.portuguesa, "tradicionais"),
  p("toscana", "Toscana", "Calabresa, mussarela e tomate", 48, IMG.calabresa, "tradicionais"),
  p("vegetariana", "Vegetariana", "Escarola refogada no alho e óleo, ervilha, milho e mussarela", 50, IMG.vegetariana, "tradicionais"),
  p("2-queijos", "2 Queijos", "Mussarela e catupiry", 48, IMG.queijos, "tradicionais"),
  p("3-queijos", "3 Queijos", "Mussarela, catupiry e parmesão", 50, IMG.queijos, "tradicionais"),
  p("4-queijos", "4 Queijos", "Mussarela, catupiry, cheddar e parmesão", 52, IMG.queijos, "tradicionais"),

  // ===== ESPECIAIS =====
  p("atum-especial", "Atum Especial", "Atum, catupiry e mussarela", 55, IMG.portuguesa, "especiais"),
  p("baiana", "Baiana", "Calabresa, ovos, cebola, mussarela e molho de pimenta", 60, IMG.calabresa, "especiais"),
  p("brocolis-branco", "Brócolis ao Molho Branco", "Brócolis, molho branco e mussarela", 55, IMG.vegetariana, "especiais"),
  p("classica", "Clássica", "Lombo, catupiry, tomate seco e mussarela", 68, IMG.portuguesa, "especiais"),
  p("do-pizziolo", "Do Pizziolo", "Mussarela, calabresa, ovos, cebola e catupiry", 55, IMG.calabresa, "especiais"),
  p("escondidinho", "Escondidinho de Carne Seca", "Carne seca, purê, mussarela e catupiry", 68, IMG.portuguesa, "especiais"),
  p("especial-casa", "Especial da Casa", "Mussarela, calabresa, bacon e tomate", 55, IMG.calabresa, "especiais"),
  p("linguica-artesanal", "Linguiça Artesanal", "Linguiça artesanal e mussarela", 48, IMG.calabresa, "especiais"),
  p("mineira", "Mineira", "Ovos, mussarela, calabresa, bacon e tomate", 55, IMG.calabresa, "especiais"),
  p("moda-casa", "Moda da Casa", "Presunto, mussarela, ovos e tomate", 55, IMG.portuguesa, "especiais"),
  p("nordestina", "Nordestina", "Carne seca, catupiry e cebola", 68, IMG.portuguesa, "especiais"),
  p("peruana", "Peruana", "Filé de frango, gorgonzola, ervilha e tomate", 68, IMG.frango, "especiais"),
  p("pepperoni", "Pepperoni", "Mussarela, pepperoni e tomate", 60, IMG.pepperoni, "especiais", "Mais pedida"),
  p("portuguesa-chefe", "Portuguesa do Chefe", "Mussarela, milho, presunto, palmito e tomate", 66, IMG.portuguesa, "especiais"),
  p("pizza-hotdog", "Pizza Hot Dog", "Milho, ervilha, salsicha, purê, batata palha e molhos", 55, IMG.calabresa, "especiais"),
  p("rucula", "Rúcula", "Mussarela, rúcula e tomate seco", 55, IMG.vegetariana, "especiais"),
  p("strogonoff-carne", "Strogonoff de Carne", "Strogonoff de carne e batata palha", 58, IMG.portuguesa, "especiais"),
  p("strogonoff-frango", "Strogonoff de Frango", "Strogonoff de frango e batata palha", 55, IMG.frango, "especiais"),
  p("vip", "VIP", "Mussarela, catupiry, cheddar, parmesão e provolone", 55, IMG.queijos, "especiais"),
  p("5-queijos", "5 Queijos", "Mussarela, catupiry, parmesão, provolone e cheddar", 58, IMG.queijos, "especiais"),
  p("6-queijos", "6 Queijos", "Mussarela, catupiry, cheddar, parmesão, provolone e gorgonzola", 60, IMG.queijos, "especiais"),

  // ===== DOCES =====
  p("banana", "Banana", "Banana com canela e açúcar", 46, IMG.romeu, "doces"),
  p("banana-nevada", "Banana Nevada", "Banana com leite condensado e chocolate branco", 48, IMG.romeu, "doces"),
  p("bis-oreo", "Bis de Oreo", "Chocolate ao leite, biscoito Bis e Oreo", 48, IMG.chocolate, "doces"),
  p("brigadeiro", "Brigadeiro", "Brigadeiro cremoso com granulado", 46, IMG.chocolate, "doces"),
  p("confete", "Confete", "Chocolate ao leite e confetes", 46, IMG.chocolate, "doces"),
  p("choconana", "Choconana", "Chocolate ao leite e banana", 48, IMG.chocolate, "doces"),
  p("ouro-branco", "Ouro Branco", "Chocolate branco e bombom Ouro Branco", 48, IMG.chocolate, "doces"),
  p("sonho-valsa", "Sonho de Valsa", "Chocolate ao leite e bombom Sonho de Valsa", 48, IMG.chocolate, "doces"),
  p("romeu-julieta", "Romeu e Julieta", "Mussarela com goiabada cremosa", 46, IMG.romeu, "doces"),
  p("prestigio", "Prestígio", "Chocolate ao leite e coco cremoso", 46, IMG.chocolate, "doces"),
  p("sensacao", "Sensação", "Chocolate ao leite e morangos frescos", 48, IMG.chocolate, "doces"),
  p("uva-verde", "Uva Verde", "Chocolate branco e uvas verdes", 48, IMG.romeu, "doces"),

  // ===== DOCES ESPECIAIS =====
  p("leite-ninho", "Leite Ninho", "Creme de Ninho e leite condensado", 58, IMG.chocolate, "doces-especiais"),
  p("pistache", "Pistache", "Creme de pistache com raspas de chocolate branco", 55, IMG.chocolate, "doces-especiais"),
  p("nutella", "Nutella", "Nutella com raspas de chocolate branco", 66, IMG.chocolate, "doces-especiais"),
  p("morango-supreme", "Morango Supreme", "Chocolate ao leite, morangos e Nutella", 66, IMG.chocolate, "doces-especiais"),
  p("floresta-negra", "Floresta Negra", "Ganache de chocolate meio amargo e cerejas", 68, IMG.chocolate, "doces-especiais"),

  // ===== BROTOS =====
  p("broto-tradicional", "Broto Tradicional", "Escolha qualquer sabor tradicional em versão broto individual", 34, IMG.mussarela, "brotos"),
  p("broto-especial", "Broto Especial", "Escolha qualquer sabor especial em versão broto individual", 40, IMG.pepperoni, "brotos"),

  // ===== BEBIDAS =====
  p("coca-2l", "Coca-Cola 2L", "Refrigerante Coca-Cola 2 litros", 16, IMG.coca, "bebidas"),
  p("guarana-2l", "Guaraná 2L", "Refrigerante Guaraná 2 litros", 15, IMG.guarana, "bebidas"),
  p("sprite-2l", "Sprite 2L", "Refrigerante Sprite 2 litros", 15, IMG.guarana, "bebidas"),
  p("fanta-laranja-2l", "Fanta Laranja 2L", "Refrigerante Fanta Laranja 2 litros", 15, IMG.guarana, "bebidas"),
  p("fanta-uva-2l", "Fanta Uva 2L", "Refrigerante Fanta Uva 2 litros", 15, IMG.guarana, "bebidas"),
  p("mantovani-2l", "Mantovani 2L", "Refrigerante Mantovani 2 litros", 10, IMG.guarana, "bebidas"),
  p("coca-lata", "Coca-Cola Lata", "Refrigerante Coca-Cola lata 350ml", 6, IMG.coca, "bebidas"),
  p("guarana-lata", "Guaraná Lata", "Refrigerante Guaraná lata 350ml", 6, IMG.guarana, "bebidas"),
  p("sprite-lata", "Sprite Lata", "Refrigerante Sprite lata 350ml", 6, IMG.guarana, "bebidas"),
  p("fanta-laranja-lata", "Fanta Laranja Lata", "Refrigerante Fanta Laranja lata 350ml", 6, IMG.guarana, "bebidas"),
  p("fanta-uva-lata", "Fanta Uva Lata", "Refrigerante Fanta Uva lata 350ml", 6, IMG.guarana, "bebidas"),
  p("suco-delvalle-lata", "Suco Del Valle Lata 290ml", "Suco Del Valle 290ml (consultar sabores)", 3.5, IMG.agua, "bebidas"),
  p("suco-delvalle-1l", "Suco Del Valle 1L", "Suco Del Valle 1 litro (consultar sabores)", 7, IMG.agua, "bebidas"),
  p("agua-sem-gas", "Água Mineral 500ml", "Água mineral sem gás 500ml", 3.5, IMG.agua, "bebidas"),
  p("agua-com-gas", "Água com Gás 500ml", "Água mineral com gás 500ml", 4, IMG.agua, "bebidas"),
  p("itaipava", "Cerveja Itaipava 350ml", "Cerveja Itaipava lata 350ml", 5, IMG.guarana, "bebidas"),
  p("skol", "Cerveja Skol 350ml", "Cerveja Skol lata 350ml", 6, IMG.guarana, "bebidas"),
  p("imperio-cerveja", "Cerveja Império 350ml", "Cerveja Império lata 350ml", 6, IMG.guarana, "bebidas"),
  p("puro-malte", "Cerveja Puro Malte 350ml", "Cerveja Puro Malte lata 350ml", 7, IMG.guarana, "bebidas"),
  p("heineken", "Cerveja Heineken 350ml", "Cerveja Heineken lata 350ml", 8, IMG.guarana, "bebidas"),
  p("vinho-artesanal", "Vinho Artesanal 1L", "Vinho artesanal 1 litro", 28, IMG.guarana, "bebidas"),

  // ===== ADICIONAIS =====
  p("ad-catupiry", "Catupiry Original", "Acréscimo em qualquer pizza", 5, IMG.queijos, "adicionais"),
  p("ad-cheddar", "Cheddar", "Acréscimo em qualquer pizza", 7, IMG.queijos, "adicionais"),
  p("ad-bacon", "Bacon", "Acréscimo em qualquer pizza", 7, IMG.calabresa, "adicionais"),
  p("ad-cebola", "Cebola", "Acréscimo em qualquer pizza", 4, IMG.vegetariana, "adicionais"),
  p("ad-tomate", "Tomate", "Acréscimo em qualquer pizza", 4, IMG.vegetariana, "adicionais"),
  p("ad-ovos", "Ovos", "Acréscimo em qualquer pizza", 4, IMG.portuguesa, "adicionais"),
  p("ad-batata-palha", "Batata Palha", "Acréscimo em qualquer pizza", 8, IMG.frango, "adicionais"),
  p("ad-azeitona", "Azeitona Preta", "Acréscimo em qualquer pizza", 6, IMG.portuguesa, "adicionais"),
  p("ad-milho", "Milho", "Acréscimo em qualquer pizza", 5, IMG.vegetariana, "adicionais"),
];

export const CATEGORIES = [
  { id: "todas", label: "Todas" },
  { id: "tradicionais", label: "Tradicionais" },
  { id: "especiais", label: "Especiais" },
  { id: "doces", label: "Doces" },
  { id: "doces-especiais", label: "Doces Especiais" },
  { id: "brotos", label: "Brotos" },
  { id: "bebidas", label: "Bebidas" },
  { id: "adicionais", label: "Adicionais" },
] as const;

export const MENU_BY_ID = Object.fromEntries(MENU.map((p) => [p.id, p]));

export interface CrustOption {
  id: string;
  name: string;
  price: number;
}

export const CRUST_OPTIONS: CrustOption[] = [
  { id: "nenhuma", name: "Sem Borda Recheada", price: 0 },
  { id: "catupiry", name: "Borda Catupiry Original", price: 5 },
  { id: "cheddar", name: "Borda Cheddar Cremoso", price: 7 },
  { id: "chocolate", name: "Borda Chocolate ao Leite", price: 7 },
  { id: "doce-leite", name: "Borda Doce de Leite", price: 7 },
];

export interface CartItem {
  id: string; // ID único do item no carrinho
  pizzaId: string;
  name: string;
  desc?: string;
  category: Category;
  isHalf: boolean;
  flavor1: {
    id: string;
    name: string;
    price: number;
    notes?: string;
    image: string;
  };
  flavor2?: {
    id: string;
    name: string;
    price: number;
    notes?: string;
    image: string;
  };
  crust: CrustOption;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Home() {
  const loaderData = Route.useLoaderData();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]["id"]>("todas");
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("imperio_cart_v2");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
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

  // Salva no localStorage para persistência de carrinho
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("imperio_cart_v2", JSON.stringify(cart));
      } catch {}
    }
  }, [cart]);

  const filtered = useMemo(
    () => (cat === "todas" ? MENU : MENU.filter((p) => p.category === cat)),
    [cat],
  );

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cart]);

  const genericCartLines = useMemo(() => {
    return cart.map((i) => ({
      item: {
        id: i.pizzaId,
        name: i.name,
        price: i.unitPrice,
        category: i.category,
      },
      qty: i.quantity,
      subtotal: i.totalPrice,
    }));
  }, [cart]);

  const appliedPromotion = useMemo(() => {
    return evaluateCartPromotions(genericCartLines, MENU_BY_ID as any, promotions);
  }, [genericCartLines, promotions]);

  const discount = appliedPromotion?.discountAmount || 0;
  const total = Math.max(0, subtotal - discount);

  // Adição Customizada com Meio a Meio e Bordas
  const handleAddCustomizedToCart = (item: CartItem) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.pizzaId === item.pizzaId &&
          i.isHalf === item.isHalf &&
          i.flavor1.id === item.flavor1.id &&
          (i.flavor1.notes || "") === (item.flavor1.notes || "") &&
          i.flavor2?.id === item.flavor2?.id &&
          (i.flavor2?.notes || "") === (item.flavor2?.notes || "") &&
          i.crust.id === item.crust.id
      );

      if (existingIdx >= 0) {
        const copy = [...prev];
        const updated = { ...copy[existingIdx] };
        updated.quantity += item.quantity;
        updated.totalPrice = updated.unitPrice * updated.quantity;
        copy[existingIdx] = updated;
        return copy;
      }
      return [...prev, item];
    });

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 600);
  };

  // Clique no cardápio
  const handleMenuItemClick = (pizzaId: string) => {
    const p = MENU_BY_ID[pizzaId];
    if (!p) return;

    // Se for pizza elegível para Meio a Meio (Grandes: Tradicionais, Especiais, Doces)
    if (
      p.category === "tradicionais" ||
      p.category === "especiais" ||
      p.category === "doces" ||
      p.category === "doces-especiais"
    ) {
      setCustomizingPizza(p);
      return;
    }

    // Se for bebida, adicional ou broto (Adição direta com 1 clique)
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

  const handleIncCartItem = (itemId: string) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, quantity: i.quantity + 1, totalPrice: i.unitPrice * (i.quantity + 1) }
          : i
      )
    );
  };

  const handleDecCartItem = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === itemId) {
            const nextQty = i.quantity - 1;
            return nextQty > 0
              ? { ...i, quantity: nextQty, totalPrice: i.unitPrice * nextQty }
              : null;
          }
          return i;
        })
        .filter((i): i is CartItem => i !== null)
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleClearCart = () => setCart([]);

  const handleOpenCart = useCallback(() => setCartOpen(true), []);
  const handleCloseCart = useCallback(() => setCartOpen(false), []);

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

/**
 * Modal Elegante de Personalização da Pizza com Meio a Meio e Bordas
 */
function PizzaCustomizerModal({
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
      quantity: 1,
      totalPrice: unitPrice,
    };

    onAddCustomized(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl border border-gold/40 bg-card shadow-2xl overflow-hidden text-foreground">
        
        {/* Header com Imagem e Fechar */}
        <div className="relative flex-none h-44 sm:h-48 w-full overflow-hidden bg-secondary">
          <img
            src={pizza.image}
            alt={pizza.name}
            className="w-full h-full object-cover brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
          
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
              1. Escolha a Composição da Pizza
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
                <span className="text-xs font-semibold">Pizza Inteira</span>
                <span className="text-[10px] text-muted-foreground/80">Sabor Único</span>
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
                <span className="text-xs font-semibold">Meio a Meio</span>
                <span className="text-[10px] text-muted-foreground/80">2 Sabores</span>
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
                      Metade 1
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
                      Metade 2
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

        {/* 4. Sticky Footer com Preço Recalculado */}
        <div className="flex-none border-t border-border bg-secondary/80 backdrop-blur-md p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Valor da Pizza {mode === "meio" && "(Regra do Maior Sabor)"}
            </span>
            <span className="font-serif text-2xl font-bold text-gold">
              {formatBRL(unitPrice)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 rounded-full bg-gold px-6 py-3 text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Adicionar ao Pedido
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ cartCount, pulse, onOpenCart }: { cartCount: number; pulse: boolean; onOpenCart: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary ring-1 ring-gold/30">
            <img src={logo} alt="Pizzaria Império" className="h-9 w-9 object-contain" width={36} height={36} />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg font-bold tracking-wide">
              PIZZARIA IMPÉRIO
            </div>
            <div className="flex items-center gap-1 text-[10px] tracking-[0.3em] text-gold">
              <Star className="h-2.5 w-2.5 fill-gold" /> DELIVERY{" "}
              <Star className="h-2.5 w-2.5 fill-gold" />
            </div>
          </div>
        </a>

        <nav className="hidden items-center gap-10 text-sm font-medium tracking-wider md:flex">
          <a href="#cardapio" className="transition hover:text-gold">CARDÁPIO</a>
          <a href="#promocoes" className="transition hover:text-gold">PROMOÇÕES</a>
          <a href="#historia" className="transition hover:text-gold">NOSSA HISTÓRIA</a>
          <a href="#contato" className="transition hover:text-gold">CONTATO</a>
        </nav>

        <button
          type="button"
          onClick={onOpenCart}
          className={`inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-gold-foreground shadow-gold-glow transition hover:brightness-110 ${pulse ? "scale-105" : ""}`}
        >
          <ShoppingBag className="h-4 w-4" />
          CARRINHO
          {cartCount > 0 && (
            <span className="ml-1 rounded-full bg-gold-foreground/90 px-2 py-0.5 text-[11px] font-bold text-gold">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden">
      <img
        src={heroForno}
        alt="Forno a lenha"
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/80 to-background" />

      <div className="mx-auto max-w-7xl px-6 py-28 md:py-36">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-secondary/80 px-4 py-1.5 text-xs font-semibold tracking-wider text-gold">
            <Flame className="h-3.5 w-3.5 fill-gold" />
            FORNO A LENHA TRADICIONAL
          </div>

          <h1 className="mt-6 font-serif text-5xl font-bold tracking-tight md:text-7xl">
            A verdadeira arte da pizza{" "}
            <span className="italic text-gradient-gold">em sua mesa</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Massa de fermentação lenta de 48 horas, molho artesanal de tomates selecionados e ingredientes da mais alta qualidade. Assadas no calor perfeito do forno a lenha.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#cardapio"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95"
            >
              Fazer Pedido Agora
            </a>
            <a
              href="#promocoes"
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-secondary/60 px-7 py-3.5 text-sm font-semibold tracking-wider transition hover:border-gold hover:text-gold"
            >
              Ver Promoções
            </a>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-border/60 pt-8">
            <div>
              <div className="flex items-center gap-2 text-gold">
                <Clock className="h-4 w-4" />
                <span className="font-serif text-xl font-bold">40-50 min</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Entrega rápida</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gold">
                <Truck className="h-4 w-4" />
                <span className="font-serif text-xl font-bold">Quentinha</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Embalagem térmica</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gold">
                <Flame className="h-4 w-4 fill-gold" />
                <span className="font-serif text-xl font-bold">400°C</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Forno a lenha</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Promocoes({
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

function Menu({
  items,
  category,
  onCategory,
  onAdd,
}: {
  items: Pizza[];
  category: string;
  onCategory: (id: (typeof CATEGORIES)[number]["id"]) => void;
  onAdd: (id: string) => void;
}) {
  return (
    <section id="cardapio" className="border-t border-border/50 bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.3em] text-gold">
            <Star className="h-3 w-3 fill-gold" /> NOSSO CARDÁPIO{" "}
            <Star className="h-3 w-3 fill-gold" />
          </div>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl">
            Feita com tempo,{" "}
            <span className="italic text-gradient-gold">servida com alma</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Tradição desde 2008, sabor em cada fatia.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
            Monte sua pizza com até <strong>2 sabores (Meio a Meio)</strong> e adicione bordas recheadas artesanais.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onCategory(c.id)}
                className={`rounded-full px-5 py-2 text-sm font-medium tracking-wide transition ${
                  active
                    ? "bg-gold text-gold-foreground shadow-gold-glow"
                    : "border border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <PizzaCard key={p.id} pizza={p} onAdd={() => onAdd(p.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PizzaCard({ pizza, onAdd }: { pizza: Pizza; onAdd: () => void }) {
  const isCustomizable =
    pizza.category === "tradicionais" ||
    pizza.category === "especiais" ||
    pizza.category === "doces" ||
    pizza.category === "doces-especiais";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-gold/50 hover:shadow-gold-glow">
      <div className="relative w-full overflow-hidden bg-secondary" style={{ paddingBottom: "75%" }}>
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,hsl(var(--gold)/0.22),hsl(var(--secondary))_62%)] px-8 text-center font-serif text-2xl text-gold">
          {pizza.name}
        </div>
        <img
          src={pizza.image}
          alt={pizza.name}
          loading="lazy"
          width={800}
          height={600}
          decoding="async"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          style={{ position: "absolute", inset: 0, zIndex: 1, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          className="transition duration-500 group-hover:scale-105"
        />

        {pizza.badge && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold-foreground">
            {pizza.badge}
          </span>
        )}
        <span className="absolute right-4 top-4 z-10 rounded-full bg-background/90 px-3 py-1 text-sm font-bold text-gold ring-1 ring-gold/40">
          {formatBRL(pizza.price)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-serif text-2xl">{pizza.name}</h3>
          {isCustomizable && (
            <span className="text-[10px] uppercase font-bold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
              Meio a Meio
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{pizza.desc}</p>
        {pizza.ingredients && (
          <p className="mt-3 text-xs tracking-wide text-muted-foreground/80">
            {pizza.ingredients}
          </p>
        )}

        <button
          type="button"
          onClick={onAdd}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-5 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold hover:text-gold-foreground"
        >
          <Plus className="h-4 w-4" /> {isCustomizable ? "Montar Pizza / Pedir" : "Adicionar ao Pedido"}
        </button>
      </div>
    </article>
  );
}

function CartDrawer({
  open,
  onClose,
  onOpen,
  cart,
  appliedPromotion,
  onInc,
  onDec,
  onRemove,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  cart: CartItem[];
  appliedPromotion: AppliedPromotionResult | null;
  onInc: (itemId: string) => void;
  onDec: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onClear: () => void;
}) {
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    cep: "",
    rua: "",
    bairro: "",
    numero: "",
    complemento: "",
    cidadeUf: "Bragança Paulista - SP",
    deliveryFee: null as number | null,
    payment: "" as "" | "Pix" | "Dinheiro" | "Cartão de crédito" | "Cartão de débito",
    troco: "",
    notes: "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [streetSearching, setStreetSearching] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState<LocationResult[]>([]);
  const [bairroSuggestions, setBairroSuggestions] = useState<Array<{ name: string; fee: number }>>([]);
  const [locationMsg, setLocationMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);
  const submitOrder = useServerFn(createOrder);
  const checkStatus = useServerFn(getOrderStatus);
  const fetchDeliveryConfig = useServerFn(getPublicDeliveryConfig);
  const fetchGpsAddress = useServerFn(reverseGeocodeGPS);
  const fetchStreetSearch = useServerFn(searchStreetAddress);
  const [deliveryConfig, setDeliveryConfig] = useState<{ default_fee: number; neighborhoods: any[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return !!(params.get("order_id") || params.get("order"));
    }
    return false;
  });

  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlOrderId = params.get("order_id") || params.get("order");
      
      if (urlOrderId) {
        setLoadingOrder(true);
        checkStatus({ data: urlOrderId })
          .then((order) => {
            if (order) {
              setSuccess(order);
              onOpen();
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch((err) => console.error("Erro ao carregar pedido do URL:", err))
          .finally(() => setLoadingOrder(false));
        return;
      }
    }

    try {
      const savedOrder = localStorage.getItem("active_order");
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        setSuccess(parsed);
        onOpen();
      }
    } catch (e) {
      localStorage.removeItem("active_order");
    }
  }, [checkStatus, onOpen]);

  const handleDismissOrder = () => {
    try {
      localStorage.removeItem("active_order");
    } catch (e) {}
    setSuccess(null);
    setStep("cart");
    setForm({
      name: "",
      phone: "",
      cep: "",
      rua: "",
      bairro: "",
      numero: "",
      complemento: "",
      cidadeUf: "Bragança Paulista - SP",
      deliveryFee: null,
      payment: "",
      troco: "",
      notes: "",
    });
    onClose();
  };

  useEffect(() => {
    if (success) {
      localStorage.setItem("active_order", JSON.stringify(success));
    } else {
      localStorage.removeItem("active_order");
    }
  }, [success]);

  useEffect(() => {
    fetchDeliveryConfig()
      .then((cfg) => {
        if (cfg) setDeliveryConfig(cfg);
      })
      .catch((err) => console.error("Erro ao carregar taxas de entrega:", err));
  }, []);

  const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const discount = appliedPromotion?.discountAmount || 0;
  const deliveryFee = form.deliveryFee || 0;
  const total = Math.max(0, subtotal - discount) + deliveryFee;

  const handleCopyPix = () => {
    if (!success?.payment_details?.qr_code) return;
    navigator.clipboard.writeText(success.payment_details.qr_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sanitize = (s: string, max: number) =>
    s.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max).trim();

  const handleCEPLookup = async (cepValue: string) => {
    const cleanCEP = cepValue.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;

    setCepLoading(true);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.cep;
      return copy;
    });

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`, {
        signal: AbortSignal.timeout(2500),
      });
      if (!res.ok) throw new Error("Erro na busca de CEP");
      const data = await res.json();
      
      if (data.erro) {
        setErrors((prev) => ({ ...prev, cep: "CEP não encontrado." }));
        return;
      }

      const fee = getDeliveryFeeForNeighborhood(data.bairro, deliveryConfig?.neighborhoods, deliveryConfig?.default_fee);

      setForm((prev) => ({
        ...prev,
        rua: data.logradouro || "",
        bairro: data.bairro || "",
        cidadeUf: `${data.localidade} - ${data.uf}`,
        deliveryFee: fee,
      }));
    } catch (err) {
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCEP}`, {
          signal: AbortSignal.timeout(2500),
        });
        if (!res.ok) throw new Error("Erro na busca de CEP");
        const data = await res.json();

        const fee = getDeliveryFeeForNeighborhood(data.neighborhood, deliveryConfig?.neighborhoods, deliveryConfig?.default_fee);

        setForm((prev) => ({
          ...prev,
          rua: data.street || "",
          bairro: data.neighborhood || "",
          cidadeUf: `${data.city} - ${data.state}`,
          deliveryFee: fee,
        }));
      } catch (err2) {
        try {
          const res = await fetch(`https://cep.awesomeapi.com.br/json/${cleanCEP}`, {
            signal: AbortSignal.timeout(2500),
          });
          if (!res.ok) throw new Error("Erro na busca de CEP");
          const data = await res.json();
          const fee = getDeliveryFeeForNeighborhood(data.district || data.neighborhood, deliveryConfig?.neighborhoods, deliveryConfig?.default_fee);

          setForm((prev) => ({
            ...prev,
            rua: data.address || "",
            bairro: data.district || data.neighborhood || "",
            cidadeUf: `${data.city} - ${data.state}`,
            deliveryFee: fee,
          }));
        } catch (err3) {
          setErrors((prev) => ({ ...prev, cep: "CEP não localizado nas bases públicas. Digite sua rua abaixo." }));
        }
      }
    } finally {
      setCepLoading(false);
    }
  };

  const handleCEPChange = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    let formatted = numeric;
    if (numeric.length > 5) {
      formatted = `${numeric.slice(0, 5)}-${numeric.slice(5, 8)}`;
    }
    
    setForm((f) => ({ ...f, cep: formatted.slice(0, 9) }));
    if (errors.cep) setErrors((e) => ({ ...e, cep: "" }));

    if (numeric.length === 8) {
      handleCEPLookup(numeric);
    }
  };

  const handleGPSLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setErrors((prev) => ({ ...prev, cep: "Geolocalização não suportada no seu navegador." }));
      return;
    }

    setLocatingGPS(true);
    setLocationMsg("Obtendo sua localização via GPS...");
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.cep;
      delete copy.rua;
      delete copy.bairro;
      return copy;
    });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const loc = await fetchGpsAddress({ data: { lat: latitude, lon: longitude } });
          if (!loc) {
            setLocationMsg(null);
            setErrors((prev) => ({ ...prev, cep: "Não foi possível identificar o endereço pelo GPS. Digite o CEP ou o nome da rua." }));
            return;
          }

          const fee = getDeliveryFeeForNeighborhood(loc.bairro, deliveryConfig?.neighborhoods, deliveryConfig?.default_fee);

          setForm((prev) => ({
            ...prev,
            rua: loc.rua || prev.rua,
            numero: loc.numero || prev.numero,
            bairro: loc.bairro || prev.bairro,
            cidadeUf: `${loc.cidade} - ${loc.uf}`,
            cep: loc.cep || prev.cep || "12900-000",
            deliveryFee: fee,
          }));
          setLocationMsg(`📍 Localizado: ${loc.rua ? loc.rua + ', ' : ''}${loc.bairro || loc.cidade}`);
          setTimeout(() => setLocationMsg(null), 5000);
        } catch (e) {
          console.error("GPS Reverse Error:", e);
          setErrors((prev) => ({ ...prev, cep: "Erro ao consultar o serviço de GPS." }));
        } finally {
          setLocatingGPS(false);
        }
      },
      (error) => {
        setLocatingGPS(false);
        setLocationMsg(null);
        if (error.code === error.PERMISSION_DENIED) {
          setErrors((prev) => ({ ...prev, cep: "Permissão de localização negada. Digite seu CEP ou o nome da rua." }));
        } else {
          setErrors((prev) => ({ ...prev, cep: "Não foi possível obter a posição do GPS." }));
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const searchTimeoutRef = useRef<any>(null);

  const handleRuaInputChange = (val: string) => {
    setForm((f) => ({ ...f, rua: val }));
    if (errors.rua) setErrors((e) => ({ ...e, rua: "" }));

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length < 3) {
      setStreetSuggestions([]);
      setStreetSearching(false);
      return;
    }

    setStreetSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await fetchStreetSearch({ data: { query: val.trim() } });
        setStreetSuggestions(results || []);
      } catch (e) {
        console.error("Erro na busca de rua:", e);
      } finally {
        setStreetSearching(false);
      }
    }, 550);
  };

  const handleSelectSuggestion = (loc: LocationResult) => {
    const fee = getDeliveryFeeForNeighborhood(loc.bairro, deliveryConfig?.neighborhoods, deliveryConfig?.default_fee);

    setForm((prev) => ({
      ...prev,
      rua: loc.rua,
      numero: loc.numero || prev.numero,
      bairro: loc.bairro,
      cidadeUf: `${loc.cidade} - ${loc.uf}`,
      cep: loc.cep || prev.cep || "12900-000",
      deliveryFee: fee,
    }));

    setStreetSuggestions([]);
    setLocationMsg(`📍 Endereço preenchido: ${loc.rua} (${loc.bairro})`);
    setTimeout(() => setLocationMsg(null), 5000);
  };

  const handleBairroInputChange = (val: string) => {
    const fee = getDeliveryFeeForNeighborhood(val, deliveryConfig?.neighborhoods, deliveryConfig?.default_fee);
    setForm((f) => ({ ...f, bairro: val, deliveryFee: fee }));
    if (errors.bairro) setErrors((e) => ({ ...e, bairro: "" }));

    if (val.trim().length >= 2 && deliveryConfig?.neighborhoods) {
      const cleanVal = cleanString(val);
      const matches = deliveryConfig.neighborhoods.filter((n: any) =>
        cleanString(n.name).includes(cleanVal)
      );
      setBairroSuggestions(matches.slice(0, 6));
    } else {
      setBairroSuggestions([]);
    }
  };

  const handleSelectBairro = (n: { name: string; fee: number }) => {
    setForm((f) => ({ ...f, bairro: n.name, deliveryFee: n.fee }));
    setBairroSuggestions([]);
    setLocationMsg(`📍 Bairro selecionado: ${n.name} (Taxa: R$ ${n.fee.toFixed(2).replace('.', ',')})`);
    setTimeout(() => setLocationMsg(null), 4000);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const name = sanitize(form.name, 80);
    const phone = sanitize(form.phone, 20);
    const cep = form.cep.replace(/\D/g, "");
    
    if (name.length < 2) e.name = "Informe seu nome completo.";
    if (phone.replace(/\D/g, "").length < 10) e.phone = "Telefone inválido (com DDD).";
    if (cep.length !== 8 && (!form.rua.trim() || !form.bairro.trim())) e.cep = "Informe seu CEP ou use o GPS/Busca por rua.";
    if (!form.rua.trim()) e.rua = "Informe a rua.";
    if (!form.numero.trim()) e.numero = "Informe o número.";
    if (!form.bairro.trim()) e.bairro = "Informe o bairro.";
    if (!form.payment) e.payment = "Selecione a forma de pagamento.";
    
    if (form.payment === "Dinheiro" && form.troco) {
      const trocoVal = Number(form.troco.replace(",", "."));
      if (isNaN(trocoVal) || trocoVal < total) {
        e.troco = `O troco deve ser maior que o total do pedido (${formatBRL(total)}).`;
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildAndSend = async () => {
    if (!validate() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const fullAddress = `${form.rua.trim()}, ${form.numero.trim()} - ${form.bairro.trim()}, ${form.cidadeUf.trim()}${form.complemento.trim() ? " (" + form.complemento.trim() + ")" : ""}`;
      
      const orderItems = cart.map((i) => {
        let fullName = i.isHalf
          ? `1/2 ${i.flavor1.name} + 1/2 ${i.flavor2?.name}`
          : i.flavor1.name;

        if (i.crust && i.crust.id !== "nenhuma") {
          fullName += ` (${i.crust.name})`;
        }

        if (i.isHalf) {
          const notesArr: string[] = [];
          if (i.flavor1.notes) notesArr.push(`1/2 ${i.flavor1.name}: ${i.flavor1.notes}`);
          if (i.flavor2?.notes) notesArr.push(`1/2 ${i.flavor2.name}: ${i.flavor2.notes}`);
          if (notesArr.length > 0) {
            fullName += ` [${notesArr.join(" | ")}]`;
          }
        } else if (i.flavor1.notes) {
          fullName += ` [Obs: ${i.flavor1.notes}]`;
        }

        return {
          pizza_id: i.pizzaId,
          pizza_name: fullName,
          quantity: i.quantity,
          unit_price: i.unitPrice,
        };
      });

      if (appliedPromotion?.rewardItem) {
        orderItems.push({
          pizza_id: appliedPromotion.rewardItem.pizza_id,
          pizza_name: `${appliedPromotion.rewardItem.pizza_name} (${appliedPromotion.rewardItem.is_gift ? "Brinde" : "Promoção"})`,
          quantity: 1,
          unit_price: appliedPromotion.rewardItem.unit_price,
        });
      }

      const res = await submitOrder({
        data: {
          customer_name: sanitize(form.name, 80),
          customer_phone: sanitize(form.phone, 20),
          customer_address: sanitize(fullAddress, 400),
          payment_method: form.payment as "Pix" | "Dinheiro" | "Cartão de crédito" | "Cartão de débito",
          troco:
            form.payment === "Dinheiro" && form.troco
              ? Number(form.troco.replace(",", "."))
              : null,
          notes: sanitize(form.notes, 300) || null,
          items: orderItems,
          delivery_fee: form.deliveryFee || 0,
          discount: appliedPromotion?.discountAmount || 0,
          promotion_id: appliedPromotion?.promotion._id || null,
          promotion_title: appliedPromotion?.promotion.title || null,
        },
      });
      setSuccess(res);
      onClear();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao enviar pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  if (loadingOrder) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <Loader2 className="h-10 w-10 text-gold animate-spin" />
          <h3 className="font-serif text-lg text-foreground mt-2">Carregando seu pedido...</h3>
          <p className="text-xs text-muted-foreground max-w-[250px]">
            Buscando informações atualizadas da sua compra.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[60] transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-gold" />
            <h2 className="font-serif text-xl font-bold">
              {success ? "Status do Pedido" : step === "cart" ? "Seu Carrinho" : "Finalizar Pedido"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              {success.payment_method === "Pix" && success.payment_details?.type === "pix" ? (
                success.payment_status === "paid" ? (
                  <div className="w-full space-y-4">
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 scale-110 transition-transform duration-500">
                      <Check className="h-8 w-8" />
                    </div>
                    <h3 className="font-serif text-2xl text-emerald-400">Pagamento Confirmado!</h3>
                    <p className="text-sm text-muted-foreground">
                      Seu Pix foi aprovado com sucesso. Nosso forno já está preparando sua pizza quentinha! 🍕
                    </p>
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full border border-gold/30 bg-secondary/60 text-gold">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl text-foreground">Pagamento Pix Pendente</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pague pelo QR Code abaixo ou utilize a chave Copia e Cola para agilizar o preparo.
                      </p>
                    </div>

                    {success.payment_details.qr_code_base64 && (
                      <div className="flex justify-center p-3 bg-white rounded-2xl w-48 h-48 mx-auto shadow-md">
                        <img
                          src={`data:image/png;base64,${success.payment_details.qr_code_base64}`}
                          alt="QR Code Pix"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-secondary/80 py-2.5 text-xs font-bold text-gold transition hover:bg-gold/20"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" /> Código Pix Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Copiar Código Pix Copia e Cola
                        </>
                      )}
                    </button>

                    <div className="rounded-xl bg-secondary/40 p-3 border border-border/50 text-left">
                      <p className="text-xs text-muted-foreground text-center">
                        Assim que o pagamento for detectado, o pedido entrará automaticamente em preparação.
                      </p>
                    </div>
                  </div>
                )
              ) : success.payment_method === "Cartão de crédito" && success.payment_details?.type === "mercadopago_preference" ? (
                success.payment_status === "paid" ? (
                  <div className="w-full space-y-4">
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 scale-110 transition-transform duration-500">
                      <Check className="h-8 w-8" />
                    </div>
                    <h3 className="font-serif text-2xl text-emerald-400">Pagamento Aprovado!</h3>
                    <p className="text-sm text-muted-foreground">
                      Seu pagamento via Cartão foi confirmado com sucesso. O pedido já está com o pizzaiolo! 🍕
                    </p>
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full border border-gold/30 bg-secondary/60 text-gold">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl text-foreground">Pagamento com Cartão</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Clique no botão abaixo para concluir o pagamento com segurança no Mercado Pago.
                      </p>
                    </div>

                    <a
                      href={success.payment_details.init_point}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-bold text-gold-foreground transition hover:brightness-110 shadow-lg"
                    >
                      Realizar Pagamento <ExternalLink className="h-4 w-4" />
                    </a>

                    <div className="rounded-xl bg-secondary/40 p-3 border border-border/50 text-left">
                      <p className="text-xs text-muted-foreground text-center">
                        O seu pedido começará a ser preparado assim que recebermos a confirmação do pagamento.
                      </p>
                    </div>
                  </div>
                )
              ) : success.payment_status === "paid" ? (
                <div className="w-full space-y-4">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 scale-110 transition-transform duration-500">
                    <Check className="h-8 w-8" />
                  </div>
                  <h3 className="font-serif text-2xl text-emerald-400">Pagamento Confirmado!</h3>
                  <p className="text-sm text-muted-foreground">
                    Seu pagamento foi recebido com sucesso. Nosso pizzaiolo já está preparando o seu pedido! 🍕
                  </p>
                </div>
              ) : success.payment_status === "failed" ? (
                <div className="w-full space-y-4">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
                    <X className="h-8 w-8" />
                  </div>
                  <h3 className="font-serif text-xl text-destructive">Falha no Pagamento</h3>
                  <p className="text-sm text-muted-foreground">
                    Infelizmente o seu pagamento não pôde ser processado. Por favor, tente refazer o pedido com outro método.
                  </p>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-gold/30 bg-secondary/60 text-gold">
                    <ShoppingBag className="h-7 w-7" />
                  </div>
                  <h3 className="font-serif text-xl text-foreground">Pedido recebido!</h3>
                  <p className="text-sm text-muted-foreground">
                    Seu pedido foi enviado para a pizzaria. Em instantes entraremos em contato para confirmar a entrega.
                  </p>
                </div>
              )}

              <div className="mt-6 w-full space-y-3 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                <p>
                  Nº do pedido: <span className="font-mono text-foreground font-semibold">{success.id.slice(0, 8)}</span>
                </p>
                <p>
                  Total: <span className="text-gold font-semibold font-serif text-sm">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(success.total)}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleDismissOrder}
                className="mt-6 w-full rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-gold-foreground transition hover:brightness-110 active:scale-95"
              >
                Fechar
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-secondary/60 text-gold">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <p className="mt-4 font-serif text-lg">Seu carrinho está vazio</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha suas pizzas favoritas no cardápio.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-gold-foreground"
              >
                Ver cardápio
              </button>
            </div>
          ) : step === "cart" ? (
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
                            <div><strong>1/2 {item.flavor1.name}:</strong> {item.flavor1.notes || "Padrão"}</div>
                            <div><strong>1/2 {item.flavor2?.name}:</strong> {item.flavor2?.notes || "Padrão"}</div>
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
                          {appliedPromotion.rewardItem.unit_price === 0 ? "R$ 0,00" : formatBRL(appliedPromotion.rewardItem.unit_price)}
                        </span>
                      </div>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep("cart")}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-gold"
              >
                ← Voltar ao carrinho
              </button>

              <Field
                label="Nome completo"
                value={form.name}
                onChange={setField("name")}
                placeholder="Ex.: João da Silva"
                error={errors.name}
                maxLength={80}
              />
              <Field
                label="Telefone (WhatsApp)"
                value={form.phone}
                onChange={setField("phone")}
                placeholder="(11) 99999-9999"
                error={errors.phone}
                maxLength={20}
                inputMode="tel"
              />
              <div className="space-y-2">
                <div className="relative">
                  <Field
                    label="CEP"
                    value={form.cep}
                    onChange={handleCEPChange}
                    placeholder="00000-000"
                    error={errors.cep}
                    maxLength={9}
                  />
                  {cepLoading && (
                    <div className="absolute right-3 top-9 text-gold animate-spin">
                      <Loader2 className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleGPSLocation}
                    disabled={locatingGPS}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/20 active:scale-95 disabled:opacity-50"
                  >
                    {locatingGPS ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Detectando GPS...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="h-3.5 w-3.5" />
                        <span>Usar minha localização (GPS)</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-muted-foreground/70">ou digite a rua abaixo</span>
                </div>

                {locationMsg && (
                  <p className="text-xs text-gold flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> {locationMsg}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Rua / Logradouro
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="text"
                      value={form.rua}
                      onChange={(e) => handleRuaInputChange(e.target.value)}
                      placeholder="Ex.: Av. dos Imigrantes"
                      maxLength={100}
                      className={`w-full rounded-xl border bg-secondary/40 pl-3.5 pr-8 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 ${
                        errors.rua ? "border-destructive" : "border-border"
                      }`}
                    />
                    {streetSearching ? (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-gold animate-spin" />
                    ) : (
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                    )}
                  </div>
                  {errors.rua && <p className="mt-1 text-xs text-destructive">{errors.rua}</p>}

                  {streetSuggestions.length > 0 && (
                    <ul className="absolute left-0 top-full z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gold/40 bg-card shadow-2xl divide-y divide-border/60">
                      {streetSuggestions.map((loc, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => handleSelectSuggestion(loc)}
                            className="flex w-full flex-col gap-0.5 px-3.5 py-2.5 text-left text-xs transition hover:bg-gold/15 hover:text-gold"
                          >
                            <span className="font-semibold text-foreground">{loc.rua}</span>
                            <span className="text-[11px] text-muted-foreground">
                              Bairro: <strong className="text-gold">{loc.bairro || "Bragança Paulista"}</strong> • CEP: {loc.cep}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <Field
                    label="Número"
                    value={form.numero}
                    onChange={setField("numero")}
                    placeholder="123"
                    error={errors.numero}
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={form.bairro}
                    onChange={(e) => handleBairroInputChange(e.target.value)}
                    placeholder="Ex.: Lavapés, Centro..."
                    maxLength={50}
                    className={`mt-1.5 w-full rounded-xl border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 ${
                      errors.bairro ? "border-destructive" : "border-border"
                    }`}
                  />
                  {errors.bairro && <p className="mt-1 text-xs text-destructive">{errors.bairro}</p>}

                  {bairroSuggestions.length > 0 && (
                    <ul className="absolute left-0 top-full z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-gold/40 bg-card shadow-2xl divide-y divide-border/60">
                      {bairroSuggestions.map((n, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => handleSelectBairro(n)}
                            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition hover:bg-gold/15 hover:text-gold"
                          >
                            <span className="font-semibold text-foreground">{n.name}</span>
                            <span className="text-[11px] text-gold font-bold">
                              Taxa: R$ {n.fee.toFixed(2).replace('.', ',')}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Field
                  label="Cidade / Estado"
                  value={form.cidadeUf}
                  onChange={setField("cidadeUf")}
                  placeholder="Ex.: São Paulo - SP"
                  error={errors.cidadeUf}
                  maxLength={50}
                />
              </div>

              <Field
                label="Complemento / Referência (opcional)"
                value={form.complemento}
                onChange={setField("complemento")}
                placeholder="Ex.: Apto 42, Bloco B"
                maxLength={80}
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Forma de Pagamento
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito"] as const).map(
                    (m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, payment: m }));
                          if (errors.payment) setErrors((e) => ({ ...e, payment: "" }));
                        }}
                        className={`rounded-xl border p-3 text-xs font-semibold transition ${
                          form.payment === m
                            ? "border-gold bg-gold text-gold-foreground shadow-gold-glow"
                            : "border-border bg-secondary/40 text-muted-foreground hover:border-gold/40 hover:text-foreground"
                        }`}
                      >
                        {m}
                      </button>
                    ),
                  )}
                </div>
                {errors.payment && (
                  <p className="mt-1 text-xs text-destructive">{errors.payment}</p>
                )}
              </div>

              {form.payment === "Dinheiro" && (
                <Field
                  label="Precisa de troco para quanto?"
                  value={form.troco}
                  onChange={setField("troco")}
                  placeholder={`Ex.: ${Math.ceil(total + 10)}`}
                  error={errors.troco}
                  maxLength={10}
                />
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Observações Gerais do Pedido (opcional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField("notes")(e.target.value)}
                  placeholder="Ex.: Tocar o interfone 42, deixar na portaria..."
                  rows={2}
                  maxLength={300}
                  className="mt-1.5 w-full resize-none rounded-xl border border-border bg-secondary/40 p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              {submitError && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  {submitError}
                </div>
              )}
            </div>
          )}
        </div>

        {cart.length > 0 && !success && (
          <div className="border-t border-border bg-secondary/40 p-6 space-y-4">
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal dos itens</span>
                <span className="font-semibold text-foreground">{formatBRL(subtotal)}</span>
              </div>
              
              {appliedPromotion && discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Desconto ({appliedPromotion.promotion.title})</span>
                  <span>-{formatBRL(discount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Taxa de entrega</span>
                <span className="font-semibold text-foreground">
                  {form.deliveryFee !== null ? formatBRL(form.deliveryFee) : "A calcular"}
                </span>
              </div>

              <div className="flex justify-between text-base font-bold text-gold pt-2 border-t border-border/60">
                <span>Total</span>
                <span className="font-serif text-lg">{formatBRL(total)}</span>
              </div>

              {form.bairro && form.deliveryFee !== null && (
                <p className="text-[10px] text-emerald-400 pt-0.5">
                  Taxa de entrega calculada para o bairro: <strong>{form.bairro}</strong>
                </p>
              )}
            </div>

            {step === "cart" ? (
              <button
                type="button"
                onClick={() => setStep("checkout")}
                className="w-full rounded-full bg-gold py-3 text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
              >
                Confirmar Pedido <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={buildAndSend}
                disabled={submitting}
                className="w-full rounded-full bg-gold py-3 text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Enviando Pedido..." : "Finalizar e Enviar"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  maxLength?: number;
  inputMode?: "text" | "tel" | "numeric";
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`mt-1.5 w-full rounded-xl border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 ${
          error ? "border-destructive" : "border-border"
        }`}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Story() {
  return (
    <section id="historia" className="border-t border-border/50 bg-secondary/20 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-gold">
              <Star className="h-3 w-3 fill-gold" /> NOSSA HISTÓRIA{" "}
              <Star className="h-3 w-3 fill-gold" />
            </div>
            <h2 className="mt-4 font-serif text-4xl font-bold md:text-5xl">
              Mais de uma década de{" "}
              <span className="italic text-gradient-gold">paixão por pizza</span>
            </h2>
            <p className="mt-6 leading-relaxed text-muted-foreground">
              A Pizzaria Império nasceu do sonho de trazer para a mesa das famílias a autêntica pizza feita com carinho, paciência e os melhores ingredientes.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Nossa massa passa por um processo de fermentação de 48 horas, resultando em uma borda leve, crocante por fora e incrivelmente macia por dentro.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-6 border-t border-border/60 pt-6">
              <div>
                <div className="font-serif text-3xl font-bold text-gold">2008</div>
                <div className="mt-1 text-xs text-muted-foreground">Ano de Fundação</div>
              </div>
              <div>
                <div className="font-serif text-3xl font-bold text-gold">+70</div>
                <div className="mt-1 text-xs text-muted-foreground">Sabores no Cardápio</div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-border shadow-2xl">
            <img
              src={pizzaiolo}
              alt="Mestre Pizzaiolo"
              className="w-full h-[450px] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contato" className="border-t border-border/50 bg-background py-20">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-gold">
          <Phone className="h-3.5 w-3.5" /> ATENDIMENTO & DELIVERY
        </div>
        <h2 className="mt-4 font-serif text-3xl md:text-4xl font-bold">
          Peça pelo site ou pelo WhatsApp
        </h2>
        <p className="mt-2 text-muted-foreground max-w-xl mx-auto text-sm">
          Atendemos de terça a domingo das 18h às 23h30 em toda a região de Bragança Paulista.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          <a
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-emerald-500"
          >
            <Phone className="h-4 w-4" /> Chamar no WhatsApp
          </a>
          <a
            href="#cardapio"
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-secondary/60 px-7 py-3 text-sm font-semibold tracking-wider text-gold transition hover:bg-gold/10"
          >
            Fazer Pedido Online
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/50 py-10 text-center text-xs text-muted-foreground">
      <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="h-6 w-6 object-contain" />
          <span className="font-serif font-bold text-sm text-foreground">Pizzaria Império</span>
          <span>© 2008 - {new Date().getFullYear()}</span>
        </div>
        <p>Desenvolvido com excelência gastronômica e alta tecnologia.</p>
      </div>
    </footer>
  );
}
