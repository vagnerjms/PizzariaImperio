import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createOrder, getOrderStatus } from "@/lib/orders.functions";
import { getDeliveryFeeForNeighborhood } from "@/lib/delivery-config";
import { getPublicDeliveryConfig } from "@/lib/delivery.functions";
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
} from "lucide-react";
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
  head: () => ({
    meta: [
      { title: "Pizzaria Império — Forno a Lenha · São Paulo" },
      {
        name: "description",
        content:
          "Pizzaria Império: massa de fermentação natural de 48h, forno a lenha a 400°C e ingredientes selecionados. Delivery em São Paulo.",
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

type Category =
  | "tradicionais"
  | "especiais"
  | "doces"
  | "doces-especiais"
  | "brotos"
  | "bebidas"
  | "adicionais";

type Pizza = {
  id: string;
  name: string;
  desc: string;
  ingredients: string;
  price: number;
  image: string;
  badge?: string;
  category: Category;
};

// Imagens de referência reutilizadas por categoria (o cardápio real tem muitos sabores)
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

const MENU: Pizza[] = [
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
  p("broto-tradicional", "Broto Tradicional", "Escolha qualquer sabor tradicional em versão broto", 34, IMG.mussarela, "brotos"),
  p("broto-especial", "Broto Especial", "Escolha qualquer sabor especial em versão broto", 40, IMG.pepperoni, "brotos"),

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

const CATEGORIES = [
  { id: "todas", label: "Todas" },
  { id: "tradicionais", label: "Tradicionais" },
  { id: "especiais", label: "Especiais" },
  { id: "doces", label: "Doces" },
  { id: "doces-especiais", label: "Doces Especiais" },
  { id: "brotos", label: "Brotos" },
  { id: "bebidas", label: "Bebidas" },
  { id: "adicionais", label: "Adicionais" },
] as const;

const MENU_BY_ID = Object.fromEntries(MENU.map((p) => [p.id, p]));

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });



function Home() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]["id"]>("todas");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const filtered = useMemo(
    () => (cat === "todas" ? MENU : MENU.filter((p) => p.category === cat)),
    [cat],
  );

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const addToCart = (id: string) => {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 600);
  };
  const decFromCart = (id: string) =>
    setCart((c) => {
      const next = { ...c };
      const cur = next[id] ?? 0;
      if (cur <= 1) delete next[id];
      else next[id] = cur - 1;
      return next;
    });
  const removeFromCart = (id: string) =>
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  const clearCart = () => setCart({});

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header cartCount={cartCount} pulse={justAdded} onOpenCart={() => setCartOpen(true)} />
      <Hero />
      <Promocoes />
      <Menu
        items={filtered}
        category={cat}
        onCategory={setCat}
        onAdd={addToCart}
      />
      <Story />
      <Contact />
      <Footer />

      {cartCount > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-gold-foreground shadow-gold-glow transition hover:brightness-110"
        >
          <ShoppingBag className="h-4 w-4" />
          Ver carrinho · {cartCount}
        </button>
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onInc={addToCart}
        onDec={decFromCart}
        onRemove={removeFromCart}
        onClear={clearCart}
      />
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
        width={1920}
        height={1280}
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-background/30" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-transparent to-background/40" />

      <div className="mx-auto max-w-7xl px-6 py-28 md:py-40">
        <div className="max-w-2xl">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/80 ring-1 ring-gold/40">
              <img src={logo} alt="" className="h-12 w-12 object-contain" width={48} height={48} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-gold">
                <Star className="h-3 w-3 fill-gold" /> EST. 2008{" "}
                <Star className="h-3 w-3 fill-gold" />
              </div>
              <div className="mt-1 text-xs tracking-[0.25em] text-muted-foreground">
                FORNO A LENHA · SÃO PAULO
              </div>
            </div>
          </div>

          <h1 className="font-serif text-5xl leading-[1.05] md:text-7xl">
            O <span className="italic text-gradient-gold">sabor</span> de um
            verdadeiro <span className="italic text-gradient-gold">império</span>.
          </h1>

          <p className="mt-6 max-w-lg text-base text-muted-foreground md:text-lg">
            Massa de fermentação natural, ingredientes selecionados e o calor
            inconfundível da lenha. Bem-vindo ao{" "}
            <span className="font-semibold text-foreground">Império da Pizza</span>.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="#cardapio"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110"
            >
              <Star className="h-4 w-4 fill-gold-foreground" /> Ver Cardápio
            </a>
            <a
              href="#contato"
              className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-transparent px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-gold transition hover:bg-gold/10"
            >
              Fale conosco
            </a>
          </div>

          <div className="mt-14 grid max-w-xl grid-cols-1 gap-6 sm:grid-cols-3">
            <Stat icon={<Flame className="h-5 w-5" />} title="Forno a lenha" sub="400°C autêntico" />
            <Stat icon={<Truck className="h-5 w-5" />} title="Entrega" sub="em até 45 min" />
            <Stat icon={<Clock className="h-5 w-5" />} title="Aberto hoje" sub="até 23:30" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-secondary/60 text-gold">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function Promocoes() {
  return (
    <section id="promocoes" className="border-t border-border/50 bg-secondary/20 py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.3em] text-gold">
          <Star className="h-3 w-3 fill-gold" /> OFERTAS RELÂMPAGO{" "}
          <Star className="h-3 w-3 fill-gold" />
        </div>
        <h2 className="mt-4 font-serif text-4xl md:text-5xl">
          Promoções <span className="italic text-gradient-gold">do Império</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Aqui aparecem as promoções relâmpago da casa. Fique de olho — novidades quentinhas saem direto do forno!
        </p>

        <div className="mt-12 rounded-3xl border border-dashed border-gold/40 bg-background/60 px-6 py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
            <Flame className="h-6 w-6" />
          </div>
          <p className="mt-6 font-serif text-2xl">Nenhuma promoção ativa no momento</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Volte em breve! As promoções relâmpago são anunciadas por aqui assim que entram no ar.
          </p>
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
            Utilizamos ingredientes selecionados, preparo cuidadoso e receitas que conquistaram a confiança dos nossos clientes ao longo dos anos.
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
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-gold/50 hover:shadow-gold-glow">
      <div className="relative w-full overflow-hidden bg-secondary" style={{ paddingBottom: "75%" }}>
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,hsl(var(--gold)/0.22),hsl(var(--secondary))_62%)] px-8 text-center font-serif text-2xl text-gold">
          {pizza.name}
        </div>
        <img
          src={pizza.image}
          alt={pizza.name}
          loading="eager"
          width={800}
          height={600}
          decoding="sync"
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
        <h3 className="font-serif text-2xl">{pizza.name}</h3>
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
          <Plus className="h-4 w-4" /> Adicionar ao Pedido
        </button>
      </div>
    </article>
  );
}

function CartDrawer({
  open,
  onClose,
  cart,
  onInc,
  onDec,
  onRemove,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  cart: Record<string, number>;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const lines = Object.entries(cart)
    .map(([id, qty]) => {
      const p = MENU_BY_ID[id];
      if (!p) return null;
      return { pizza: p, qty, subtotal: p.price * qty };
    })
    .filter((l): l is { pizza: Pizza; qty: number; subtotal: number } => l !== null);

  const total = lines.reduce((acc, l) => acc + l.subtotal, 0);

  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    cep: "",
    rua: "",
    bairro: "",
    numero: "",
    complemento: "",
    cidadeUf: "São Paulo - SP",
    deliveryFee: null as number | null,
    payment: "" as "" | "Pix" | "Dinheiro" | "Cartão de crédito" | "Cartão de débito",
    troco: "",
    notes: "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);
  const submitOrder = useServerFn(createOrder);
  const checkStatus = useServerFn(getOrderStatus);
  const fetchDeliveryConfig = useServerFn(getPublicDeliveryConfig);
  const [deliveryConfig, setDeliveryConfig] = useState<{ default_fee: number; neighborhoods: any[] } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDeliveryConfig()
      .then((cfg) => setDeliveryConfig(cfg))
      .catch((err) => console.error("Erro ao obter taxas de entrega:", err));
  }, []);

  useEffect(() => {
    if (lines.length === 0 && step === "checkout" && !success) setStep("cart");
  }, [lines.length, step, success]);

  useEffect(() => {
    if (!success || success.payment_status !== "pending") return;

    const interval = setInterval(async () => {
      try {
        const order = await checkStatus({ data: success.id });
        if (order) {
          if (order.payment_status === "paid") {
            setSuccess((prev: any) =>
              prev ? { ...prev, payment_status: "paid" } : null,
            );
          } else if (order.payment_status === "failed") {
            setSuccess((prev: any) =>
              prev ? { ...prev, payment_status: "failed" } : null,
            );
          }
        }
      } catch (err) {
        console.error("Error polling order status:", err);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [success?.id, success?.payment_status, checkStatus]);

  const handleCopyPix = (code: string) => {
    navigator.clipboard.writeText(code);
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
      console.error("ViaCEP falhou ou expirou timeout, tentando BrasilAPI...", err);
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
        setErrors((prev) => ({ ...prev, cep: "Erro ao buscar o CEP." }));
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

  const validate = () => {
    const e: Record<string, string> = {};
    const name = sanitize(form.name, 80);
    const phone = sanitize(form.phone, 20);
    const cep = form.cep.replace(/\D/g, "");
    
    if (name.length < 2) e.name = "Informe seu nome completo.";
    if (phone.replace(/\D/g, "").length < 10) e.phone = "Telefone inválido (com DDD).";
    if (cep.length !== 8) e.cep = "CEP inválido.";
    if (!form.rua.trim()) e.rua = "Informe a rua.";
    if (!form.numero.trim()) e.numero = "Informe o número.";
    if (!form.bairro.trim()) e.bairro = "Informe o bairro.";
    if (!form.payment) e.payment = "Selecione a forma de pagamento.";
    
    if (form.payment === "Dinheiro" && form.troco) {
      const v = Number(form.troco.replace(",", "."));
      const finalTotal = total + (form.deliveryFee || 0);
      if (!Number.isFinite(v) || v < finalTotal) {
        e.troco = `Valor deve ser maior que o total (R$ ${finalTotal.toFixed(2).replace(".", ",")}).`;
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
          items: lines.map((l) => ({
            pizza_id: l.pizza.id,
            pizza_name: l.pizza.name,
            quantity: l.qty,
            unit_price: l.pizza.price,
          })),
          delivery_fee: form.deliveryFee || 0,
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

  return (
    <div
      className={`fixed inset-0 z-[60] transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-gold" />
            <h2 className="font-serif text-xl">
              {step === "cart" ? "Seu Pedido" : "Finalizar Pedido"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar carrinho"
            className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {success ? (
            <div className="flex h-full flex-col items-center justify-center text-center px-2 py-4">
              {success.payment_status === "pending" ? (
                success.payment_details?.type === "pix" ? (
                  <div className="w-full space-y-4">
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold animate-pulse">
                      <ShoppingBag className="h-7 w-7" />
                    </div>
                    <h3 className="font-serif text-xl text-foreground">Aguardando Pix...</h3>
                    <p className="text-sm text-muted-foreground">
                      Escaneie o QR Code abaixo pelo aplicativo do seu banco para pagar.
                    </p>
                    
                    {success.payment_details.qr_code_base64 && (
                      <div className="mx-auto w-44 h-44 border-2 border-gold/20 rounded-2xl p-2 bg-white flex items-center justify-center shadow-lg">
                        <img 
                          src={`data:image/jpeg;base64,${success.payment_details.qr_code_base64}`} 
                          alt="QR Code Pix"
                          className="w-40 h-40 object-contain"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Pix Copia e Cola
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={success.payment_details.qr_code || ""}
                          className="flex-1 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs font-mono text-muted-foreground focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyPix(success.payment_details.qr_code)}
                          className="flex items-center justify-center rounded-xl bg-gold px-3.5 py-2 text-xs font-bold text-gold-foreground transition hover:brightness-110"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground text-left">
                        {copied ? "Código copiado para a área de transferência!" : "Clique no botão ao lado para copiar o código Pix."}
                      </p>
                    </div>

                    <div className="rounded-xl bg-secondary/40 p-3 border border-border/50">
                      <p className="text-xs text-muted-foreground">
                        A confirmação é automática. O seu pedido começará a ser preparado após o pagamento.
                      </p>
                    </div>
                  </div>
                ) : success.payment_details?.type === "card" ? (
                  <div className="w-full space-y-5">
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                      <ShoppingBag className="h-7 w-7" />
                    </div>
                    <h3 className="font-serif text-xl text-foreground">Pagar Pedido</h3>
                    <p className="text-sm text-muted-foreground">
                      Clique no botão abaixo para pagar via Cartão de Crédito com total segurança através do Mercado Pago.
                    </p>

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
                ) : (
                  <div className="space-y-4">
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-gold/30 bg-secondary/60 text-gold animate-bounce">
                      <ShoppingBag className="h-7 w-7" />
                    </div>
                    <h3 className="font-serif text-xl text-foreground">Pedido recebido!</h3>
                    <p className="text-sm text-muted-foreground">
                      Seu pedido foi enviado para a pizzaria. Em instantes entraremos em contato.
                    </p>
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
                onClick={() => {
                  setSuccess(null);
                  setStep("cart");
                  setForm({ name: "", phone: "", cep: "", rua: "", bairro: "", numero: "", complemento: "", cidadeUf: "São Paulo - SP", deliveryFee: null, payment: "", troco: "", notes: "" });
                  onClose();
                }}
                className="mt-6 w-full rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-gold-foreground transition hover:brightness-110"
              >
                Fechar
              </button>
            </div>
          ) : lines.length === 0 ? (
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
            <ul className="space-y-4">
              {lines.map(({ pizza, qty, subtotal }) => (
                <li
                  key={pizza.id}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-3"
                >
                  <img
                    src={pizza.image}
                    alt={pizza.name}
                    width={80}
                    height={80}
                    className="h-20 w-20 flex-none rounded-xl object-cover"
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-serif text-base leading-tight">{pizza.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {formatBRL(pizza.price)} cada
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(pizza.id)}
                        aria-label={`Remover ${pizza.name}`}
                        className="rounded-full p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60">
                        <button
                          type="button"
                          onClick={() => onDec(pizza.id)}
                          aria-label="Diminuir quantidade"
                          className="rounded-full p-1.5 text-foreground transition hover:bg-gold/20"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold">{qty}</span>
                        <button
                          type="button"
                          onClick={() => onInc(pizza.id)}
                          aria-label="Aumentar quantidade"
                          className="rounded-full p-1.5 text-foreground transition hover:bg-gold/20"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-sm font-bold text-gold">{formatBRL(subtotal)}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
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

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Field
                    label="Rua / Logradouro"
                    value={form.rua}
                    onChange={setField("rua")}
                    placeholder="Ex.: Rua das Flores"
                    error={errors.rua}
                    maxLength={100}
                  />
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
                <Field
                  label="Bairro"
                  value={form.bairro}
                  onChange={setField("bairro")}
                  placeholder="Ex.: Centro"
                  error={errors.bairro}
                  maxLength={50}
                />
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
                error={errors.complemento}
                maxLength={100}
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Forma de pagamento
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito"] as const).map(
                    (opt) => {
                      const active = form.payment === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setField("payment")(opt)}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                            active
                              ? "border-gold bg-gold/15 text-gold"
                              : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    },
                  )}
                </div>
                {errors.payment && (
                  <p className="mt-1 text-xs text-destructive">{errors.payment}</p>
                )}
              </div>

              {form.payment === "Dinheiro" && (
                <Field
                  label="Troco para quanto? (opcional)"
                  value={form.troco}
                  onChange={setField("troco")}
                  placeholder={`Ex.: ${(total + 20).toFixed(2).replace(".", ",")}`}
                  error={errors.troco}
                  maxLength={10}
                  inputMode="decimal"
                />
              )}

              <Field
                label="Observações (opcional)"
                value={form.notes}
                onChange={setField("notes")}
                placeholder="Ex.: sem cebola, ponto de entrega…"
                maxLength={300}
                multiline
              />
            </div>
          )}
        </div>

        {!success && lines.length > 0 && (
          <div className="border-t border-border/60 bg-card/40 px-6 py-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatBRL(total)}</span>
            </div>
            
            {step === "checkout" && (
              <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                <span>Taxa de entrega</span>
                <span>
                  {form.deliveryFee === null
                    ? "A calcular"
                    : form.deliveryFee === 0
                    ? "Grátis"
                    : formatBRL(form.deliveryFee)}
                </span>
              </div>
            )}

            <div className="mt-2 border-t border-border/40 pt-2 flex items-center justify-between">
              <span className="font-serif text-lg">Total</span>
              <span className="font-serif text-2xl text-gold">
                {formatBRL(total + (step === "checkout" && form.deliveryFee ? form.deliveryFee : 0))}
              </span>
            </div>

            {step === "cart" ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Taxa de entrega calculada no próximo passo (pelo CEP).
              </p>
            ) : form.deliveryFee === null ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Informe o seu CEP acima para calcular a taxa de entrega.
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-emerald-500 font-medium">
                Taxa de entrega calculada para o bairro: <strong>{form.bairro || "informado"}</strong>
              </p>
            )}

            {submitError && (
              <p className="mt-3 text-sm text-destructive">{submitError}</p>
            )}

            {step === "cart" ? (
              <button
                type="button"
                onClick={() => setStep("checkout")}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110"
              >
                Continuar pedido
              </button>
            ) : (
              <button
                type="button"
                onClick={buildAndSend}
                disabled={submitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? "Enviando…" : "Confirmar pedido"}
              </button>
            )}
            <button
              type="button"
              onClick={onClear}
              className="mt-3 w-full rounded-full border border-border bg-transparent px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-destructive"
            >
              Esvaziar carrinho
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  maxLength,
  inputMode,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  maxLength?: number;
  inputMode?: "text" | "tel" | "decimal" | "email";
  multiline?: boolean;
}) {
  const base =
    "mt-1.5 w-full rounded-xl border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50";
  const cls = error ? `${base} border-destructive` : `${base} border-border`;
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={2}
          className={cls}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={inputMode}
          className={cls}
        />
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Story() {
  return (
    <section id="historia" className="border-t border-border/50 py-24">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-2 lg:items-center">
        <div className="relative">
          <img
            src={pizzaiolo}
            alt="Pizzaiolo preparando a massa"
            loading="lazy"
            width={1200}
            height={1500}
            className="rounded-2xl object-cover shadow-gold-glow"
          />
          <div className="absolute -bottom-8 -right-4 hidden w-56 rounded-2xl border border-gold/30 bg-card p-5 shadow-gold-glow md:block">
            <div className="text-xs tracking-[0.25em] text-gold">DESDE</div>
            <div className="mt-1 font-serif text-5xl">2008</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Tradição em São Paulo
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold tracking-[0.3em] text-gold">
            NOSSA HISTÓRIA
          </div>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl">
            Desde 2008, fazendo do{" "}
            <span className="italic text-gradient-gold">simples</span> algo
            extraordinário.
          </h2>
          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>
              A Pizzaria Império Delivery nasceu em 2008 com um propósito simples: levar pizzas de alta qualidade, sabor marcante e atendimento diferenciado para as famílias da nossa região.
            </p>
            <p>
              Desde o início, acreditamos que uma boa pizza vai muito além dos ingredientes. Por isso, construímos nossa história valorizando receitas cuidadosamente preparadas, ingredientes selecionados e um compromisso constante com a satisfação dos nossos clientes.
            </p>
            <p>
              Ao longo dos anos, a Pizzaria Império Delivery conquistou a confiança de centenas de famílias, tornando-se referência quando o assunto é sabor, qualidade e entrega rápida. Cada pizza que sai da nossa cozinha é preparada com dedicação, mantendo o padrão que nos acompanha desde o primeiro dia de funcionamento.
            </p>
            <p>
              Mais de uma década depois, continuamos evoluindo, investindo em melhorias e acompanhando as novas tecnologias para oferecer uma experiência cada vez mais prática e eficiente, sem abrir mão da tradição que nos trouxe até aqui.
            </p>
            <p>
              Agradecemos a todos os clientes que fazem parte da nossa trajetória. Vocês são a razão da nossa história e a inspiração para continuarmos entregando momentos especiais a cada pedido.
            </p>
            <p className="font-semibold text-foreground">
              Pizzaria Império Delivery — desde 2008 levando sabor, qualidade e tradição até você.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4">
            <Fact value="15+" label="Anos de história" />
            <Fact value="48h" label="De fermentação" />
            <Fact value="400°" label="Forno a lenha" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 text-center">
      <div className="font-serif text-3xl text-gold md:text-4xl">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Contact() {
  return (
    <section id="contato" className="border-t border-border/50 bg-secondary/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.3em] text-gold">
            <Star className="h-3 w-3 fill-gold" /> VENHA NOS VISITAR{" "}
            <Star className="h-3 w-3 fill-gold" />
          </div>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl">
            Pronto para um{" "}
            <span className="italic text-gradient-gold">jantar inesquecível</span>?
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <ContactCard
            icon={<Phone className="h-5 w-5" />}
            title="Telefone"
            primary="(11) 99552-5230"
            link={{ href: "tel:+5511995525230", label: "Chamar no WhatsApp →", external: false }}
            wa
          />
          <ContactCard
            icon={<MapPin className="h-5 w-5" />}
            title="Endereço"
            primary="Pizzaria Império — São Paulo, SP"
            link={{
              href: "https://maps.google.com/?q=Pizzaria+Imp%C3%A9rio+S%C3%A3o+Paulo",
              label: "Ver no Google Maps →",
              external: true,
            }}
          />
          <div className="rounded-2xl border border-border bg-card p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-secondary text-gold">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-xl">Horários</h3>
            </div>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                ["Segunda-feira", "17:00 – 23:30"],
                ["Terça-feira", "18:00 – 23:30"],
                ["Quarta-feira", "18:00 – 23:30"],
                ["Quinta-feira", "18:00 – 23:30"],
                ["Sexta-feira", "18:00 – 23:30"],
                ["Sábado", "18:00 – 23:30"],
                ["Domingo", "18:00 – 23:30"],
              ].map(([d, h]) => (
                <li key={d} className="flex justify-between border-b border-border/40 pb-2 last:border-0">
                  <span className="text-muted-foreground">{d}</span>
                  <span className="font-medium">{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactCard({
  icon,
  title,
  primary,
  link,
  wa,
}: {
  icon: React.ReactNode;
  title: string;
  primary: string;
  link: { href: string; label: string; external: boolean };
  wa?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-7">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-secondary text-gold">
          {icon}
        </div>
        <h3 className="font-serif text-xl">{title}</h3>
      </div>
      <p className="mt-5 text-lg font-medium">{primary}</p>
      <a
        href={link.href}
        target={link.external || wa ? "_blank" : undefined}
        rel={link.external || wa ? "noreferrer" : undefined}
        className="mt-3 inline-block text-sm font-semibold text-gold transition hover:brightness-125"
      >
        {link.label}
      </a>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background py-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-8 w-8" width={32} height={32} />
            <span className="font-serif text-sm tracking-wider">
              PIZZARIA IMPÉRIO · DESDE 2008
            </span>
          </div>
          <a
            href="https://www.instagram.com/pizzaria_imperio011/"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram da Pizzaria Império"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gold transition hover:brightness-125"
          >
            <Instagram className="h-4 w-4" /> @pizzaria_imperio011
          </a>
        </div>
        <div className="mt-6 border-t border-border/40 pt-6 text-center">
          <p className="text-xs leading-relaxed text-muted-foreground">
            © {new Date().getFullYear()} Pizzaria Império. Todos os direitos reservados. Desenvolvido por Pedro Almeida e Vagner Moraes. Contato: (11) 9 7181-7100.
          </p>
        </div>
      </div>
    </footer>
  );
}

