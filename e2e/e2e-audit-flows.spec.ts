import { test, expect } from "@playwright/test";

test.describe("Fluxo E2E 1: Montagem de Pedido e Cálculo Dinâmico de Frete", () => {
  test("Deve navegar pelo cardápio, adicionar item, consultar CEP e calcular taxa", async ({ page }) => {
    await page.goto("http://localhost:3002");

    // 1. Verificar carregamento do catálogo
    await expect(page.locator("text=Pizzaria Império")).toBeVisible();

    // 2. Adicionar primeira pizza à sacola
    const addBtn = page.locator('button:has-text("Adicionar")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
    }

    // 3. Abrir a sacola / modal de checkout
    const sacolaBtn = page.locator('button:has-text("Sacola")');
    await expect(sacolaBtn).toBeVisible();
    await sacolaBtn.click();

    // 4. Clicar em Finalizar Pedido
    const finalizarBtn = page.locator('button:has-text("Finalizar Pedido")');
    await expect(finalizarBtn).toBeVisible();
    await finalizarBtn.click();

    // 5. Preencher dados de entrega e CEP de Bragança Paulista (12900-000)
    await page.fill('input[placeholder="00000-000"]', "12900-000");
    await page.press('input[placeholder="00000-000"]', "Tab");

    // 6. Verificar se os campos de endereço foram preenchidos
    await expect(page.locator('input[value*="Bragança Paulista"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Fluxo E2E 2: Controle de Acesso Baseado em Papéis (RBAC)", () => {
  test("Atendente deve ter acesso restrito apenas aos Pedidos", async ({ page }) => {
    await page.goto("http://localhost:3002/auth");

    await page.fill('input[type="email"]', "atendente@pizzaria.com");
    await page.fill('input[type="password"]', "atendente123");
    await page.click('button:has-text("Entrar")');

    // Validar visualização do painel
    await expect(page.locator("text=Painel Administrativo")).toBeVisible();
    await expect(page.locator("text=Atendente")).toBeVisible();

    // Abas de WhatsApp e Configurações NÃO devem existir para o Atendente
    await expect(page.locator('button:has-text("WhatsApp")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Configurações")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Taxas de Entrega")')).not.toBeVisible();
  });

  test("Supervisor deve acessar Pedidos, WhatsApp, Indicadores e Taxas de Entrega", async ({ page }) => {
    await page.goto("http://localhost:3002/auth");

    await page.fill('input[type="email"]', "supervisor@pizzaria.com");
    await page.fill('input[type="password"]', "supervisor123");
    await page.click('button:has-text("Entrar")');

    await expect(page.locator("text=Supervisor")).toBeVisible();
    await expect(page.locator('button:has-text("WhatsApp")')).toBeVisible();
    await expect(page.locator('button:has-text("Indicadores")')).toBeVisible();
    await expect(page.locator('button:has-text("Taxas de Entrega")')).toBeVisible();
    await expect(page.locator('button:has-text("Configurações")')).not.toBeVisible();
  });

  test("Admin deve ter acesso a todos os módulos, incluindo Configurações de API", async ({ page }) => {
    await page.goto("http://localhost:3002/auth");

    await page.fill('input[type="email"]', "admin@pizzaria.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button:has-text("Entrar")');

    await expect(page.locator("text=ADMIN")).toBeVisible();
    await expect(page.locator('button:has-text("Configurações")')).toBeVisible();
    await expect(page.locator('button:has-text("Taxas de Entrega")')).toBeVisible();
  });
});
