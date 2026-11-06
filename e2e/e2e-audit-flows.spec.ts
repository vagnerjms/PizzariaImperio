import { test, expect } from "@playwright/test";

test.describe("Fluxo E2E 1: Montagem de Pedido e Checkout em Etapas (Identificação, Entrega e Pagamento)", () => {
  test("Deve navegar pelo cardápio, adicionar pizza, confirmar identidade, escolher onde receber e forma de pagamento", async ({
    page,
  }) => {
    await page.goto("http://localhost:3002");

    // 1. Verificar carregamento do catálogo
    await expect(page.locator("text=PIZZARIA IMPÉRIO").first()).toBeVisible();

    // 2. Clicar na primeira pizza para abrir o modal de montagem (1 Sabor)
    const addBtn = page.locator('button:has-text("Adicionar"), button:has-text("Escolher")').first();
    await addBtn.click();

    // Se abriu o modal de Pizza Inteira, confirmar adição ao carrinho
    const confirmModalBtn = page.locator('button:has-text("Adicionar ao Carrinho")');
    if (await confirmModalBtn.isVisible()) {
      await confirmModalBtn.click();
    }

    // 3. Abrir o Carrinho pelo botão do Header
    const cartBtn = page.locator('button:has-text("CARRINHO")');
    await expect(cartBtn).toBeVisible();
    await cartBtn.click();

    // 4. Etapa 0 (Carrinho) -> Clicar em Confirmar Pedido
    const confirmarPedidoBtn = page.locator('button:has-text("Confirmar Pedido")');
    await expect(confirmarPedidoBtn).toBeVisible();
    await confirmarPedidoBtn.click();

    // 5. Etapa 1 (Identifique-se) -> Preencher WhatsApp e Nome + Selo Ambiente seguro
    await expect(page.locator("text=Identifique-se")).toBeVisible();
    await expect(page.locator("text=Ambiente seguro")).toBeVisible();

    await page.fill('input[placeholder="(11) 9 0000-0000"]', "11971756304");
    await page.fill('input[placeholder="Nome e sobrenome"]', "Vagner Moraes");
    await page.click('button:has-text("Avançar")');

    // Modal "Confirme seus dados" deve aparecer
    await expect(page.locator("text=Confirme seus dados")).toBeVisible();
    await expect(page.locator("text=Vagner Moraes")).toBeVisible();
    await page.click('button:has-text("Confirmar")');

    // 6. Etapa 2 (Escolha onde receber) -> Testar Retirada Grátis e Entrega com CEP
    await expect(page.locator("text=Escolha onde receber")).toBeVisible();
    await expect(page.locator("text=Será entregue para")).toBeVisible();

    // Testar opção Buscar o pedido (Grátis)
    await page.click('button:has-text("Buscar o pedido")');
    await expect(page.locator("text=Grátis").first()).toBeVisible();

    // Alternar para Cadastrar novo endereço e consultar CEP de Bragança Paulista
    await page.click('button:has-text("Cadastrar novo endereço")');
    await page.fill('input[placeholder="12900-000"]', "12900-000");
    await page.fill('input[placeholder="123"]', "100");

    const avancarPagamentoBtn = page.locator('button:has-text("Avançar para pagamento")');
    await expect(avancarPagamentoBtn).toBeVisible();
    await avancarPagamentoBtn.click();

    // 7. Etapa 3 (Escolha como pagar) -> Validar opções Pix (Mais rápido) e Pagar na entrega
    await expect(page.locator("text=Escolha como pagar")).toBeVisible();
    await expect(page.locator("text=Mais rápido")).toBeVisible();
    await page.click('button:has-text("Pix")');

    await expect(page.locator('button:has-text("Finalizar pedido")')).toBeEnabled();
  });
});

test.describe("Fluxo E2E 2: Controle de Acesso Baseado em Papéis (RBAC) e KDS", () => {
  test("Atendente deve ter acesso restrito apenas aos Pedidos (KDS)", async ({ page }) => {
    await page.goto("http://localhost:3002/auth");

    await page.fill('input[type="email"]', "atendente@pizzaria.com");
    await page.fill('input[type="password"]', "atendente123");
    await page.click('button:has-text("Entrar")');

    await expect(page.locator("text=Painel Administrativo")).toBeVisible();
    await expect(page.locator("text=Atendente")).toBeVisible();

    // Abas administrativas NÃO devem existir para o Atendente
    await expect(page.locator('button:has-text("Cardápio")')).not.toBeVisible();
    await expect(page.locator('button:has-text("WhatsApp")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Configurações")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Taxas de Entrega")')).not.toBeVisible();
  });

  test("Supervisor deve acessar Pedidos, Cardápio, WhatsApp, Indicadores e Taxas de Entrega", async ({
    page,
  }) => {
    await page.goto("http://localhost:3002/auth");

    await page.fill('input[type="email"]', "supervisor@pizzaria.com");
    await page.fill('input[type="password"]', "supervisor123");
    await page.click('button:has-text("Entrar")');

    await expect(page.locator("text=Supervisor")).toBeVisible();
    await expect(page.locator('button:has-text("Cardápio")')).toBeVisible();
    await expect(page.locator('button:has-text("WhatsApp")')).toBeVisible();
    await expect(page.locator('button:has-text("Indicadores")')).toBeVisible();
    await expect(page.locator('button:has-text("Taxas de Entrega")')).toBeVisible();
    await expect(page.locator('button:has-text("Configurações")')).not.toBeVisible();
  });

  test("Admin deve ter acesso a todos os módulos, incluindo Cardápio, Usuários e Configurações", async ({
    page,
  }) => {
    await page.goto("http://localhost:3002/auth");

    await page.fill('input[type="email"]', "admin@pizzaria.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button:has-text("Entrar")');

    await expect(page.locator("text=Admin")).toBeVisible();
    await expect(page.locator('button:has-text("Cardápio")')).toBeVisible();
    await expect(page.locator('button:has-text("Configurações")')).toBeVisible();
    await expect(page.locator('button:has-text("Taxas de Entrega")')).toBeVisible();
  });
});
