export interface MenuItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  category: "tradicionais" | "especiais" | "doces" | "doces-especiais" | "brotos" | "bebidas" | "adicionais";
  badge?: string;
}

export const MENU_ITEMS: MenuItem[] = [
  // TRADICIONAIS
  { id: "abobrinha", name: "Abobrinha", desc: "Abobrinha, mussarela, parmesão e alho", price: 48, category: "tradicionais" },
  { id: "alho", name: "Alho", desc: "Alho e mussarela", price: 48, category: "tradicionais" },
  { id: "atum", name: "Atum", desc: "Atum e cebola", price: 48, category: "tradicionais" },
  { id: "bacon", name: "Bacon", desc: "Bacon e mussarela", price: 48, category: "tradicionais" },
  { id: "baianinha", name: "Baianinha", desc: "Calabresa, cebola, molho de pimenta e parmesão", price: 48, category: "tradicionais" },
  { id: "bauru", name: "Bauru", desc: "Presunto, tomate e mussarela", price: 46, category: "tradicionais" },
  { id: "bragantina", name: "Bragantina", desc: "Linguiça, calabresa e cebola", price: 50, category: "tradicionais" },
  { id: "brasileira", name: "Brasileira", desc: "Presunto, mussarela e bacon", price: 48, category: "tradicionais" },
  { id: "brocolis", name: "Brócolis", desc: "Brócolis, mussarela, bacon e alho frito", price: 48, category: "tradicionais" },
  { id: "calabresa", name: "Calabresa", desc: "Calabresa, cebola e mussarela", price: 48, category: "tradicionais", badge: "Mais pedida" },
  { id: "calabria", name: "Calábria", desc: "Calabresa, cebola e catupiry", price: 48, category: "tradicionais" },
  { id: "caicara", name: "Caiçara", desc: "Atum, palmito e mussarela", price: 46, category: "tradicionais" },
  { id: "carijo", name: "Carijó", desc: "Frango, milho, catupiry e bacon", price: 48, category: "tradicionais" },
  { id: "do-chef", name: "Do Chef", desc: "Calabresa, presunto, catupiry e mussarela", price: 50, category: "tradicionais" },
  { id: "elite", name: "Elite", desc: "Frango, palmito, ervilha, milho, mussarela e catupiry", price: 48, category: "tradicionais" },
  { id: "escarola", name: "Escarola", desc: "Escarola refogada no alho e óleo, mussarela e bacon", price: 48, category: "tradicionais" },
  { id: "francesa", name: "Francesa", desc: "Mussarela, palmito e cheddar", price: 48, category: "tradicionais" },
  { id: "frango-mussarela", name: "Frango Mussarela", desc: "Frango e mussarela", price: 46, category: "tradicionais" },
  { id: "frango-catupiry", name: "Frango com Catupiry", desc: "Frango e catupiry", price: 46, category: "tradicionais", badge: "Mais pedida" },
  { id: "frango-bicolor", name: "Frango Bicolor", desc: "Frango, catupiry e cheddar", price: 48, category: "tradicionais" },
  { id: "frango-cheddar", name: "Frango e Cheddar", desc: "Frango e cheddar", price: 48, category: "tradicionais" },
  { id: "imperio", name: "Império", desc: "Mussarela, palmito, milho e ervilha", price: 48, category: "tradicionais" },
  { id: "jardineira", name: "Jardineira", desc: "Presunto, ovos, mussarela, ervilha e cheddar", price: 48, category: "tradicionais" },
  { id: "lombo", name: "Lombo", desc: "Lombo, cebola e mussarela", price: 48, category: "tradicionais" },
  { id: "marguerita", name: "Marguerita", desc: "Mussarela, tomate e manjericão", price: 46, category: "tradicionais" },
  { id: "milho", name: "Milho", desc: "Milho e mussarela", price: 46, category: "tradicionais" },
  { id: "mussarela", name: "Mussarela", desc: "Mussarela e orégano", price: 46, category: "tradicionais" },
  { id: "napolitana", name: "Napolitana", desc: "Mussarela, tomate e parmesão", price: 48, category: "tradicionais" },
  { id: "palmito", name: "Palmito", desc: "Palmito e mussarela", price: 48, category: "tradicionais" },
  { id: "paulista", name: "Paulista", desc: "Frango, ovos, mussarela, cebola e catupiry", price: 48, category: "tradicionais" },
  { id: "picardia", name: "Picardia", desc: "Frango, ovos, cebola, mussarela e molho de pimenta", price: 48, category: "tradicionais" },
  { id: "portuguesa", name: "Portuguesa", desc: "Presunto, ovos, cebola, mussarela e ervilha", price: 50, category: "tradicionais" },
  { id: "toscana", name: "Toscana", desc: "Calabresa, mussarela e tomate", price: 48, category: "tradicionais" },
  { id: "vegetariana", name: "Vegetariana", desc: "Escarola refogada no alho e óleo, ervilha, milho e mussarela", price: 50, category: "tradicionais" },
  { id: "2-queijos", name: "2 Queijos", desc: "Mussarela e catupiry", price: 48, category: "tradicionais" },
  { id: "3-queijos", name: "3 Queijos", desc: "Mussarela, catupiry e parmesão", price: 50, category: "tradicionais" },
  { id: "4-queijos", name: "4 Queijos", desc: "Mussarela, catupiry, cheddar e parmesão", price: 52, category: "tradicionais" },

  // ESPECIAIS
  { id: "atum-especial", name: "Atum Especial", desc: "Atum, catupiry e mussarela", price: 55, category: "especiais" },
  { id: "baiana", name: "Baiana", desc: "Calabresa, ovos, cebola, mussarela e molho de pimenta", price: 60, category: "especiais" },
  { id: "brocolis-branco", name: "Brócolis ao Molho Branco", desc: "Brócolis, molho branco e mussarela", price: 55, category: "especiais" },
  { id: "classica", name: "Clássica", desc: "Lombo, catupiry, tomate seco e mussarela", price: 68, category: "especiais" },
  { id: "do-pizziolo", name: "Do Pizziolo", desc: "Mussarela, calabresa, ovos, cebola e catupiry", price: 55, category: "especiais" },
  { id: "escondidinho", name: "Escondidinho de Carne Seca", desc: "Carne seca, purê, mussarela e catupiry", price: 68, category: "especiais" },
  { id: "especial-casa", name: "Especial da Casa", desc: "Mussarela, calabresa, bacon e tomate", price: 55, category: "especiais" },
  { id: "linguica-artesanal", name: "Linguiça Artesanal", desc: "Linguiça artesanal e mussarela", price: 48, category: "especiais" },
  { id: "mineira", name: "Mineira", desc: "Ovos, mussarela, calabresa, bacon e tomate", price: 55, category: "especiais" },
  { id: "moda-casa", name: "Moda da Casa", desc: "Presunto, mussarela, ovos e tomate", price: 55, category: "especiais" },
  { id: "nordestina", name: "Nordestina", desc: "Carne seca, catupiry e cebola", price: 68, category: "especiais" },
  { id: "peruana", name: "Peruana", desc: "Filé de frango, gorgonzola, ervilha e tomate", price: 68, category: "especiais" },
  { id: "pepperoni", name: "Pepperoni", desc: "Mussarela, pepperoni e tomate", price: 60, category: "especiais", badge: "Mais pedida" },
  { id: "portuguesa-chefe", name: "Portuguesa do Chefe", desc: "Mussarela, milho, presunto, palmito e tomate", price: 66, category: "especiais" },
  { id: "pizza-hotdog", name: "Pizza Hot Dog", desc: "Milho, ervilha, salsicha, purê, batata palha e molhos", price: 55, category: "especiais" },
  { id: "rucula", name: "Rúcula", desc: "Mussarela, rúcula e tomate seco", price: 55, category: "especiais" },
  { id: "strogonoff-carne", name: "Strogonoff de Carne", desc: "Strogonoff de carne e batata palha", price: 58, category: "especiais" },
  { id: "strogonoff-frango", name: "Strogonoff de Frango", desc: "Strogonoff de frango e batata palha", price: 55, category: "especiais" },
  { id: "vip", name: "VIP", desc: "Mussarela, catupiry, cheddar, parmesão e provolone", price: 55, category: "especiais" },
  { id: "5-queijos", name: "5 Queijos", desc: "Mussarela, catupiry, parmesão, provolone e cheddar", price: 58, category: "especiais" },
  { id: "6-queijos", name: "6 Queijos", desc: "Mussarela, catupiry, cheddar, parmesão, provolone e gorgonzola", price: 60, category: "especiais" },

  // DOCES
  { id: "banana", name: "Banana", desc: "Banana com canela e açúcar", price: 46, category: "doces" },
  { id: "banana-nevada", name: "Banana Nevada", desc: "Banana com leite condensado e chocolate branco", price: 48, category: "doces" },
  { id: "bis-oreo", name: "Bis de Oreo", desc: "Chocolate ao leite, biscoito Bis e Oreo", price: 48, category: "doces" },
  { id: "brigadeiro", name: "Brigadeiro", desc: "Brigadeiro cremoso com granulado", price: 46, category: "doces" },
  { id: "confete", name: "Confete", desc: "Chocolate ao leite e confetes", price: 46, category: "doces" },
  { id: "choconana", name: "Choconana", desc: "Chocolate ao leite e banana", price: 48, category: "doces" },
  { id: "ouro-branco", name: "Ouro Branco", desc: "Chocolate branco e bombom Ouro Branco", price: 48, category: "doces" },
  { id: "sonho-valsa", name: "Sonho de Valsa", desc: "Chocolate ao leite e bombom Sonho de Valsa", price: 48, category: "doces" },
  { id: "romeu-julieta", name: "Romeu e Julieta", desc: "Mussarela com goiabada cremosa", price: 46, category: "doces" },
  { id: "prestigio", name: "Prestígio", desc: "Chocolate ao leite e coco cremoso", price: 46, category: "doces" },
  { id: "sensacao", name: "Sensação", desc: "Chocolate ao leite e morangos frescos", price: 48, category: "doces" },
  { id: "uva-verde", name: "Uva Verde", desc: "Chocolate branco e uvas verdes", price: 48, category: "doces" },

  // DOCES ESPECIAIS
  { id: "leite-ninho", name: "Leite Ninho", desc: "Creme de Ninho e leite condensado", price: 58, category: "doces-especiais" },
  { id: "pistache", name: "Pistache", desc: "Creme de pistache com raspas de chocolate branco", price: 55, category: "doces-especiais" },
  { id: "nutella", name: "Nutella", desc: "Nutella com raspas de chocolate branco", price: 66, category: "doces-especiais" },
  { id: "morango-supreme", name: "Morango Supreme", desc: "Chocolate ao leite, morangos e Nutella", price: 66, category: "doces-especiais" },
  { id: "floresta-negra", name: "Floresta Negra", desc: "Ganache de chocolate meio amargo e cerejas", price: 68, category: "doces-especiais" },

  // BEBIDAS
  { id: "coca-2l", name: "Coca-Cola 2L", desc: "Refrigerante Coca-Cola 2 litros", price: 16, category: "bebidas" },
  { id: "guarana-2l", name: "Guaraná 2L", desc: "Refrigerante Guaraná 2 litros", price: 15, category: "bebidas" },
  { id: "sprite-2l", name: "Sprite 2L", desc: "Refrigerante Sprite 2 litros", price: 15, category: "bebidas" },
  { id: "fanta-laranja-2l", name: "Fanta Laranja 2L", desc: "Refrigerante Fanta Laranja 2 litros", price: 15, category: "bebidas" },
  { id: "fanta-uva-2l", name: "Fanta Uva 2L", desc: "Refrigerante Fanta Uva 2 litros", price: 15, category: "bebidas" },
  { id: "mantovani-2l", name: "Mantovani 2L", desc: "Refrigerante Mantovani 2 litros", price: 10, category: "bebidas" },
  { id: "coca-lata", name: "Coca-Cola Lata", desc: "Refrigerante Coca-Cola lata 350ml", price: 6, category: "bebidas" },
  { id: "guarana-lata", name: "Guaraná Lata", desc: "Refrigerante Guaraná lata 350ml", price: 6, category: "bebidas" },
  { id: "agua-sem-gas", name: "Água Mineral 500ml", desc: "Água mineral sem gás 500ml", price: 3.5, category: "bebidas" },
  { id: "heineken", name: "Cerveja Heineken 350ml", desc: "Cerveja Heineken lata 350ml", price: 8, category: "bebidas" },
];

export const MENU_ITEMS_BY_ID = Object.fromEntries(MENU_ITEMS.map((item) => [item.id, item]));

export const PROMO_CATEGORIES = [
  { id: "todas", label: "Qualquer Pizza / Produto" },
  { id: "salgadas", label: "Pizzas Salgadas (Tradicionais e Especiais)" },
  { id: "tradicionais", label: "Pizzas Tradicionais" },
  { id: "especiais", label: "Pizzas Especiais" },
  { id: "doces", label: "Pizzas Doces" },
  { id: "doces-especiais", label: "Pizzas Doces Especiais" },
  { id: "bebidas", label: "Bebidas" },
];
