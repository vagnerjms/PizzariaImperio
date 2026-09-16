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

export interface CrustOption {
  id: string;
  name: string;
  price: number;
}

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

// Imagens de referência reutilizadas por categoria
export const MENU_IMAGES = {
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
  p("abobrinha", "Abobrinha", "Abobrinha, mussarela, parmesão e alho", 48, MENU_IMAGES.vegetariana, "tradicionais"),
  p("alho", "Alho", "Alho e mussarela", 48, MENU_IMAGES.mussarela, "tradicionais"),
  p("atum", "Atum", "Atum e cebola", 48, MENU_IMAGES.portuguesa, "tradicionais"),
  p("bacon", "Bacon", "Bacon e mussarela", 48, MENU_IMAGES.calabresa, "tradicionais"),
  p("baianinha", "Baianinha", "Calabresa, cebola, molho de pimenta e parmesão", 48, MENU_IMAGES.calabresa, "tradicionais"),
  p("bauru", "Bauru", "Presunto, tomate e mussarela", 46, MENU_IMAGES.portuguesa, "tradicionais"),
  p("bragantina", "Bragantina", "Linguiça, calabresa e cebola", 50, MENU_IMAGES.calabresa, "tradicionais"),
  p("brasileira", "Brasileira", "Presunto, mussarela e bacon", 48, MENU_IMAGES.portuguesa, "tradicionais"),
  p("brocolis", "Brócolis", "Brócolis, mussarela, bacon e alho frito", 48, MENU_IMAGES.vegetariana, "tradicionais"),
  p("calabresa", "Calabresa", "Calabresa, cebola e mussarela", 48, MENU_IMAGES.calabresa, "tradicionais", "Mais pedida"),
  p("calabria", "Calábria", "Calabresa, cebola e catupiry", 48, MENU_IMAGES.calabresa, "tradicionais"),
  p("caicara", "Caiçara", "Atum, palmito e mussarela", 46, MENU_IMAGES.portuguesa, "tradicionais"),
  p("carijo", "Carijó", "Frango, milho, catupiry e bacon", 48, MENU_IMAGES.frango, "tradicionais"),
  p("do-chef", "Do Chef", "Calabresa, presunto, catupiry e mussarela", 50, MENU_IMAGES.calabresa, "tradicionais"),
  p("elite", "Elite", "Frango, palmito, ervilha, milho, mussarela e catupiry", 48, MENU_IMAGES.frango, "tradicionais"),
  p("escarola", "Escarola", "Escarola refogada no alho e óleo, mussarela e bacon", 48, MENU_IMAGES.vegetariana, "tradicionais"),
  p("francesa", "Francesa", "Mussarela, palmito e cheddar", 48, MENU_IMAGES.queijos, "tradicionais"),
  p("frango-mussarela", "Frango Mussarela", "Frango e mussarela", 46, MENU_IMAGES.frango, "tradicionais"),
  p("frango-catupiry", "Frango com Catupiry", "Frango e catupiry", 46, MENU_IMAGES.frango, "tradicionais", "Mais pedida"),
  p("frango-bicolor", "Frango Bicolor", "Frango, catupiry e cheddar", 48, MENU_IMAGES.frango, "tradicionais"),
  p("frango-cheddar", "Frango e Cheddar", "Frango e cheddar", 48, MENU_IMAGES.frango, "tradicionais"),
  p("imperio", "Império", "Mussarela, palmito, milho e ervilha", 48, MENU_IMAGES.vegetariana, "tradicionais"),
  p("jardineira", "Jardineira", "Presunto, ovos, mussarela, ervilha e cheddar", 48, MENU_IMAGES.portuguesa, "tradicionais"),
  p("lombo", "Lombo", "Lombo, cebola e mussarela", 48, MENU_IMAGES.portuguesa, "tradicionais"),
  p("marguerita", "Marguerita", "Mussarela, tomate e manjericão", 46, MENU_IMAGES.mussarela, "tradicionais"),
  p("milho", "Milho", "Milho e mussarela", 46, MENU_IMAGES.mussarela, "tradicionais"),
  p("mussarela", "Mussarela", "Mussarela e orégano", 46, MENU_IMAGES.mussarela, "tradicionais"),
  p("napolitana", "Napolitana", "Mussarela, tomate e parmesão", 48, MENU_IMAGES.mussarela, "tradicionais"),
  p("palmito", "Palmito", "Palmito e mussarela", 48, MENU_IMAGES.vegetariana, "tradicionais"),
  p("paulista", "Paulista", "Frango, ovos, mussarela, cebola e catupiry", 48, MENU_IMAGES.frango, "tradicionais"),
  p("picardia", "Picardia", "Frango, ovos, cebola, mussarela e molho de pimenta", 48, MENU_IMAGES.frango, "tradicionais"),
  p("portuguesa", "Portuguesa", "Presunto, ovos, cebola, mussarela e ervilha", 50, MENU_IMAGES.portuguesa, "tradicionais"),
  p("toscana", "Toscana", "Calabresa, mussarela e tomate", 48, MENU_IMAGES.calabresa, "tradicionais"),
  p("vegetariana", "Vegetariana", "Escarola refogada no alho e óleo, ervilha, milho e mussarela", 50, MENU_IMAGES.vegetariana, "tradicionais"),
  p("2-queijos", "2 Queijos", "Mussarela e catupiry", 48, MENU_IMAGES.queijos, "tradicionais"),
  p("3-queijos", "3 Queijos", "Mussarela, catupiry e parmesão", 50, MENU_IMAGES.queijos, "tradicionais"),
  p("4-queijos", "4 Queijos", "Mussarela, catupiry, cheddar e parmesão", 52, MENU_IMAGES.queijos, "tradicionais"),

  // ===== ESPECIAIS =====
  p("atum-especial", "Atum Especial", "Atum, catupiry e mussarela", 55, MENU_IMAGES.portuguesa, "especiais"),
  p("baiana", "Baiana", "Calabresa, ovos, cebola, mussarela e molho de pimenta", 60, MENU_IMAGES.calabresa, "especiais"),
  p("brocolis-branco", "Brócolis ao Molho Branco", "Brócolis, molho branco e mussarela", 55, MENU_IMAGES.vegetariana, "especiais"),
  p("classica", "Clássica", "Lombo, catupiry, tomate seco e mussarela", 68, MENU_IMAGES.portuguesa, "especiais"),
  p("do-pizziolo", "Do Pizziolo", "Mussarela, calabresa, ovos, cebola e catupiry", 55, MENU_IMAGES.calabresa, "especiais"),
  p("escondidinho", "Escondidinho de Carne Seca", "Carne seca, purê, mussarela e catupiry", 68, MENU_IMAGES.portuguesa, "especiais"),
  p("especial-casa", "Especial da Casa", "Mussarela, calabresa, bacon e tomate", 55, MENU_IMAGES.calabresa, "especiais"),
  p("linguica-artesanal", "Linguiça Artesanal", "Linguiça artesanal e mussarela", 48, MENU_IMAGES.calabresa, "especiais"),
  p("mineira", "Mineira", "Ovos, mussarela, calabresa, bacon e tomate", 55, MENU_IMAGES.calabresa, "especiais"),
  p("moda-casa", "Moda da Casa", "Presunto, mussarela, ovos e tomate", 55, MENU_IMAGES.portuguesa, "especiais"),
  p("nordestina", "Nordestina", "Carne seca, catupiry e cebola", 68, MENU_IMAGES.portuguesa, "especiais"),
  p("peruana", "Peruana", "Filé de frango, gorgonzola, ervilha e tomate", 68, MENU_IMAGES.frango, "especiais"),
  p("pepperoni", "Pepperoni", "Mussarela, pepperoni e tomate", 60, MENU_IMAGES.pepperoni, "especiais", "Mais pedida"),
  p("portuguesa-chefe", "Portuguesa do Chefe", "Mussarela, milho, presunto, palmito e tomate", 66, MENU_IMAGES.portuguesa, "especiais"),
  p("pizza-hotdog", "Pizza Hot Dog", "Milho, ervilha, salsicha, purê, batata palha e molhos", 55, MENU_IMAGES.calabresa, "especiais"),
  p("rucula", "Rúcula", "Mussarela, rúcula e tomate seco", 55, MENU_IMAGES.vegetariana, "especiais"),
  p("strogonoff-carne", "Strogonoff de Carne", "Strogonoff de carne e batata palha", 58, MENU_IMAGES.portuguesa, "especiais"),
  p("strogonoff-frango", "Strogonoff de Frango", "Strogonoff de frango e batata palha", 55, MENU_IMAGES.frango, "especiais"),
  p("vip", "VIP", "Mussarela, catupiry, cheddar, parmesão e provolone", 55, MENU_IMAGES.queijos, "especiais"),
  p("5-queijos", "5 Queijos", "Mussarela, catupiry, parmesão, provolone e cheddar", 58, MENU_IMAGES.queijos, "especiais"),
  p("6-queijos", "6 Queijos", "Mussarela, catupiry, cheddar, parmesão, provolone e gorgonzola", 60, MENU_IMAGES.queijos, "especiais"),

  // ===== DOCES =====
  p("banana", "Banana", "Banana com canela e açúcar", 46, MENU_IMAGES.romeu, "doces"),
  p("banana-nevada", "Banana Nevada", "Banana com leite condensado e chocolate branco", 48, MENU_IMAGES.romeu, "doces"),
  p("bis-oreo", "Bis de Oreo", "Chocolate ao leite, biscoito Bis e Oreo", 48, MENU_IMAGES.chocolate, "doces"),
  p("brigadeiro", "Brigadeiro", "Brigadeiro cremoso com granulado", 46, MENU_IMAGES.chocolate, "doces"),
  p("confete", "Confete", "Chocolate ao leite e confetes", 46, MENU_IMAGES.chocolate, "doces"),
  p("choconana", "Choconana", "Chocolate ao leite e banana", 48, MENU_IMAGES.chocolate, "doces"),
  p("ouro-branco", "Ouro Branco", "Chocolate branco e bombom Ouro Branco", 48, MENU_IMAGES.chocolate, "doces"),
  p("sonho-valsa", "Sonho de Valsa", "Chocolate ao leite e bombom Sonho de Valsa", 48, MENU_IMAGES.chocolate, "doces"),
  p("romeu-julieta", "Romeu e Julieta", "Mussarela com goiabada cremosa", 46, MENU_IMAGES.romeu, "doces"),
  p("prestigio", "Prestígio", "Chocolate ao leite e coco cremoso", 46, MENU_IMAGES.chocolate, "doces"),
  p("sensacao", "Sensação", "Chocolate ao leite e morangos frescos", 48, MENU_IMAGES.chocolate, "doces"),
  p("uva-verde", "Uva Verde", "Chocolate branco e uvas verdes", 48, MENU_IMAGES.romeu, "doces"),

  // ===== DOCES ESPECIAIS =====
  p("leite-ninho", "Leite Ninho", "Creme de Ninho e leite condensado", 58, MENU_IMAGES.chocolate, "doces-especiais"),
  p("pistache", "Pistache", "Creme de pistache com raspas de chocolate branco", 55, MENU_IMAGES.chocolate, "doces-especiais"),
  p("nutella", "Nutella", "Nutella com raspas de chocolate branco", 66, MENU_IMAGES.chocolate, "doces-especiais"),
  p("morango-supreme", "Morango Supreme", "Chocolate ao leite, morangos e Nutella", 66, MENU_IMAGES.chocolate, "doces-especiais"),
  p("floresta-negra", "Floresta Negra", "Ganache de chocolate meio amargo e cerejas", 68, MENU_IMAGES.chocolate, "doces-especiais"),

  // ===== BROTOS =====
  p("broto-tradicional", "Broto Tradicional", "Escolha qualquer sabor tradicional em versão broto individual", 34, MENU_IMAGES.mussarela, "brotos"),
  p("broto-especial", "Broto Especial", "Escolha qualquer sabor especial em versão broto individual", 40, MENU_IMAGES.pepperoni, "brotos"),

  // ===== BEBIDAS =====
  p("coca-2l", "Coca-Cola 2L", "Refrigerante Coca-Cola 2 litros", 16, MENU_IMAGES.coca, "bebidas"),
  p("guarana-2l", "Guaraná 2L", "Refrigerante Guaraná 2 litros", 15, MENU_IMAGES.guarana, "bebidas"),
  p("sprite-2l", "Sprite 2L", "Refrigerante Sprite 2 litros", 15, MENU_IMAGES.guarana, "bebidas"),
  p("fanta-laranja-2l", "Fanta Laranja 2L", "Refrigerante Fanta Laranja 2 litros", 15, MENU_IMAGES.guarana, "bebidas"),
  p("fanta-uva-2l", "Fanta Uva 2L", "Refrigerante Fanta Uva 2 litros", 15, MENU_IMAGES.guarana, "bebidas"),
  p("mantovani-2l", "Mantovani 2L", "Refrigerante Mantovani 2 litros", 10, MENU_IMAGES.guarana, "bebidas"),
  p("coca-lata", "Coca-Cola Lata", "Refrigerante Coca-Cola lata 350ml", 6, MENU_IMAGES.coca, "bebidas"),
  p("guarana-lata", "Guaraná Lata", "Refrigerante Guaraná lata 350ml", 6, MENU_IMAGES.guarana, "bebidas"),
  p("sprite-lata", "Sprite Lata", "Refrigerante Sprite lata 350ml", 6, MENU_IMAGES.guarana, "bebidas"),
  p("fanta-laranja-lata", "Fanta Laranja Lata", "Refrigerante Fanta Laranja lata 350ml", 6, MENU_IMAGES.guarana, "bebidas"),
  p("fanta-uva-lata", "Fanta Uva Lata", "Refrigerante Fanta Uva lata 350ml", 6, MENU_IMAGES.guarana, "bebidas"),
  p("suco-delvalle-lata", "Suco Del Valle Lata 290ml", "Suco Del Valle 290ml (consultar sabores)", 3.5, MENU_IMAGES.agua, "bebidas"),
  p("suco-delvalle-1l", "Suco Del Valle 1L", "Suco Del Valle 1 litro (consultar sabores)", 7, MENU_IMAGES.agua, "bebidas"),
  p("agua-sem-gas", "Água Mineral 500ml", "Água mineral sem gás 500ml", 3.5, MENU_IMAGES.agua, "bebidas"),
  p("agua-com-gas", "Água com Gás 500ml", "Água mineral com gás 500ml", 4, MENU_IMAGES.agua, "bebidas"),
  p("itaipava", "Cerveja Itaipava 350ml", "Cerveja Itaipava lata 350ml", 5, MENU_IMAGES.guarana, "bebidas"),
  p("skol", "Cerveja Skol 350ml", "Cerveja Skol lata 350ml", 6, MENU_IMAGES.guarana, "bebidas"),
  p("imperio-cerveja", "Cerveja Império 350ml", "Cerveja Império lata 350ml", 6, MENU_IMAGES.guarana, "bebidas"),
  p("puro-malte", "Cerveja Puro Malte 350ml", "Cerveja Puro Malte lata 350ml", 7, MENU_IMAGES.guarana, "bebidas"),
  p("heineken", "Cerveja Heineken 350ml", "Cerveja Heineken lata 350ml", 8, MENU_IMAGES.guarana, "bebidas"),
  p("vinho-artesanal", "Vinho Artesanal 1L", "Vinho artesanal 1 litro", 28, MENU_IMAGES.guarana, "bebidas"),

  // ===== ADICIONAIS =====
  p("ad-catupiry", "Catupiry Original", "Acréscimo em qualquer pizza", 5, MENU_IMAGES.queijos, "adicionais"),
  p("ad-cheddar", "Cheddar", "Acréscimo em qualquer pizza", 7, MENU_IMAGES.queijos, "adicionais"),
  p("ad-bacon", "Bacon", "Acréscimo em qualquer pizza", 7, MENU_IMAGES.calabresa, "adicionais"),
  p("ad-cebola", "Cebola", "Acréscimo em qualquer pizza", 4, MENU_IMAGES.vegetariana, "adicionais"),
  p("ad-tomate", "Tomate", "Acréscimo em qualquer pizza", 4, MENU_IMAGES.vegetariana, "adicionais"),
  p("ad-ovos", "Ovos", "Acréscimo em qualquer pizza", 4, MENU_IMAGES.portuguesa, "adicionais"),
  p("ad-batata-palha", "Batata Palha", "Acréscimo em qualquer pizza", 8, MENU_IMAGES.frango, "adicionais"),
  p("ad-azeitona", "Azeitona Preta", "Acréscimo em qualquer pizza", 6, MENU_IMAGES.portuguesa, "adicionais"),
  p("ad-milho", "Milho", "Acréscimo em qualquer pizza", 5, MENU_IMAGES.vegetariana, "adicionais"),
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

export const CATEGORY_ICONS: Record<string, string> = {
  todas: "🍕",
  tradicionais: "🍕",
  especiais: "⭐",
  doces: "🍫",
  "doces-especiais": "🍰",
  brotos: "🍕",
  bebidas: "🥤",
  adicionais: "🍟",
};

export const MENU_BY_ID: Record<string, Pizza> = Object.fromEntries(MENU.map((p) => [p.id, p]));

export const CRUST_OPTIONS: CrustOption[] = [
  { id: "nenhuma", name: "Sem Borda Recheada", price: 0 },
  { id: "catupiry", name: "Borda Catupiry Original", price: 5 },
  { id: "cheddar", name: "Borda Cheddar Cremoso", price: 7 },
  { id: "chocolate", name: "Borda Chocolate ao Leite", price: 7 },
  { id: "doce-leite", name: "Borda Doce de Leite", price: 7 },
];

export const SERVER_MENU_PRICES: Record<string, { name: string; price: number; category: string }> = Object.fromEntries(
  MENU.map((m) => [m.id, { name: m.name, price: m.price, category: m.category }])
);

export const SERVER_CRUST_PRICES: Record<string, { name: string; price: number }> = Object.fromEntries(
  CRUST_OPTIONS.map((c) => [c.id, { name: c.name, price: c.price }])
);

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
