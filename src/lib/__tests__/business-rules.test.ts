import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { calculateVerifiedOrderPricing, EffectiveMenuPriceEntry } from "../order-pricing";
import { evaluateCartPromotions } from "../promotions-engine";
import { matchDeliveryFee } from "../delivery-config";
import { escapeHtml } from "../thermal-printer";
import { Promotion } from "../promotions.types";

const SAMPLE_MENU: Record<string, EffectiveMenuPriceEntry> = {
  calabresa: { name: "Calabresa", price: 46, category: "tradicionais", available: true },
  pepperoni: { name: "Pepperoni", price: 62, category: "especiais", available: true },
  "coca-2l": { name: "Coca-Cola 2L", price: 15, category: "bebidas", available: true },
  esgotada: { name: "Especial Esgotada", price: 68, category: "especiais", available: false },
};

const SAMPLE_CRUSTS: Record<string, { name: string; price: number }> = {
  nenhuma: { name: "Sem Borda", price: 0 },
  catupiry: { name: "Borda Catupiry", price: 5 },
  cheddar: { name: "Borda Cheddar", price: 7 },
};

const PROMO_PERCENT_ESPECIAIS: Promotion = {
  _id: "promo-esp-10",
  title: "10% OFF Especiais",
  description: "10% em pizzas especiais",
  active: true,
  type: "PERCENTAGE_DISCOUNT",
  discount_value: 10,
  trigger_type: "category",
  trigger_category: "especiais",
  trigger_min_qty: 1,
  trigger_min_total: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const PROMO_BUY2_GET_COKE: Promotion = {
  _id: "promo-coke",
  title: "Compre 2 Tradicionais, Ganhe Coca 2L",
  description: "Na compra de 2 tradicionais ganhe 1 Coca 2L",
  active: true,
  type: "BUY_X_GET_Y",
  trigger_type: "category",
  trigger_category: "tradicionais",
  trigger_min_qty: 2,
  trigger_min_total: 0,
  reward_item_id: "coca-2l",
  reward_item_name: "Coca-Cola 2L",
  reward_discount_percent: 100,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("calculateVerifiedOrderPricing (Anti-Tampering & Business Rules)", () => {
  test("recalculates single pizza + crust price ignoring spoofed client unit_price", () => {
    const res = calculateVerifiedOrderPricing({
      items: [
        {
          pizza_id: "calabresa",
          crust_id: "catupiry",
          pizza_name: "Calabresa (Borda Catupiry)",
          quantity: 2,
          unit_price: 0.01,
        },
      ],
      deliveryMode: "delivery",
      officialDeliveryFee: 7,
      effectiveMenuPrices: SAMPLE_MENU,
      crustPrices: SAMPLE_CRUSTS,
      activePromotions: [],
    });

    assert.equal(res.validatedItems[0].unit_price, 51);
    assert.equal(res.subtotal, 102);
    assert.equal(res.verifiedDeliveryFee, 7);
    assert.equal(res.verifiedDiscount, 0);
    assert.equal(res.total, 109);
  });

  test("charges highest flavor price + crust for half-and-half pizzas", () => {
    const res = calculateVerifiedOrderPricing({
      items: [
        {
          pizza_id: "calabresa",
          flavor2_id: "pepperoni",
          crust_id: "cheddar",
          pizza_name: "1/2 Calabresa + 1/2 Pepperoni (Borda Cheddar)",
          quantity: 1,
          unit_price: 10,
        },
      ],
      deliveryMode: "pickup",
      officialDeliveryFee: 7,
      effectiveMenuPrices: SAMPLE_MENU,
      crustPrices: SAMPLE_CRUSTS,
      activePromotions: [],
    });

    assert.equal(res.validatedItems[0].unit_price, 69);
    assert.equal(res.validatedItems[0].base_pizza_name, "1/2 Calabresa + 1/2 Pepperoni");
    assert.equal(res.verifiedDeliveryFee, 0);
    assert.equal(res.total, 69);
  });

  test("blocks unknown pizza_id, out-of-stock items, and invalid crust_id", () => {
    assert.throws(
      () =>
        calculateVerifiedOrderPricing({
          items: [
            { pizza_id: "item-falso", pizza_name: "Fake", quantity: 1, unit_price: 1 },
          ],
          deliveryMode: "delivery",
          officialDeliveryFee: 5,
          effectiveMenuPrices: SAMPLE_MENU,
          crustPrices: SAMPLE_CRUSTS,
          activePromotions: [],
        }),
      /Item inválido/
    );

    assert.throws(
      () =>
        calculateVerifiedOrderPricing({
          items: [
            {
              pizza_id: "esgotada",
              pizza_name: "Especial Esgotada",
              quantity: 1,
              unit_price: 68,
            },
          ],
          deliveryMode: "delivery",
          officialDeliveryFee: 5,
          effectiveMenuPrices: SAMPLE_MENU,
          crustPrices: SAMPLE_CRUSTS,
          activePromotions: [],
        }),
      /esgotado/
    );

    assert.throws(
      () =>
        calculateVerifiedOrderPricing({
          items: [
            {
              pizza_id: "calabresa",
              crust_id: "borda-inexistente",
              pizza_name: "Calabresa",
              quantity: 1,
              unit_price: 46,
            },
          ],
          deliveryMode: "delivery",
          officialDeliveryFee: 5,
          effectiveMenuPrices: SAMPLE_MENU,
          crustPrices: SAMPLE_CRUSTS,
          activePromotions: [],
        }),
      /Borda inválida/
    );
  });

  test("prevents 100% discount bypass when no promotion qualifies", () => {
    const res = calculateVerifiedOrderPricing({
      items: [
        { pizza_id: "calabresa", pizza_name: "Calabresa", quantity: 1, unit_price: 46 },
      ],
      deliveryMode: "delivery",
      officialDeliveryFee: 7,
      effectiveMenuPrices: SAMPLE_MENU,
      crustPrices: SAMPLE_CRUSTS,
      activePromotions: [PROMO_PERCENT_ESPECIAIS],
    });

    assert.equal(res.verifiedDiscount, 0);
    assert.equal(res.promotionId, null);
    assert.equal(res.total, 53);
  });

  test("rejects order containing only a forged BUY_X_GET_Y reward item", () => {
    assert.throws(
      () =>
        calculateVerifiedOrderPricing({
          items: [
            {
              pizza_id: "coca-2l",
              pizza_name: "Coca-Cola 2L (Brinde)",
              quantity: 1,
              unit_price: 0,
              is_reward_item: true,
            },
          ],
          deliveryMode: "pickup",
          officialDeliveryFee: 0,
          effectiveMenuPrices: SAMPLE_MENU,
          crustPrices: SAMPLE_CRUSTS,
          activePromotions: [PROMO_BUY2_GET_COKE],
        }),
      /ao menos um item válido/
    );
  });

  test("automatically awards BUY_X_GET_Y gift only when trigger is legitimately met", () => {
    const res = calculateVerifiedOrderPricing({
      items: [
        { pizza_id: "calabresa", pizza_name: "Calabresa", quantity: 2, unit_price: 46 },
      ],
      deliveryMode: "dine_in",
      officialDeliveryFee: 7,
      effectiveMenuPrices: SAMPLE_MENU,
      crustPrices: SAMPLE_CRUSTS,
      activePromotions: [PROMO_BUY2_GET_COKE],
    });

    assert.equal(res.validatedItems.length, 2);
    assert.equal(res.validatedItems[1].pizza_id, "coca-2l");
    assert.equal(res.validatedItems[1].unit_price, 0);
    assert.equal(res.validatedItems[1].is_reward, true);
    assert.equal(res.promotionId, "promo-coke");
    assert.equal(res.total, 92);
  });

  test("applies category percentage discount only to matching lines including half-and-half flavor2", () => {
    const res = calculateVerifiedOrderPricing({
      items: [
        {
          pizza_id: "calabresa",
          flavor2_id: "pepperoni",
          pizza_name: "1/2 Calabresa + 1/2 Pepperoni",
          quantity: 1,
          unit_price: 62,
        },
        { pizza_id: "coca-2l", pizza_name: "Coca-Cola 2L", quantity: 1, unit_price: 15 },
      ],
      deliveryMode: "pickup",
      officialDeliveryFee: 0,
      effectiveMenuPrices: SAMPLE_MENU,
      crustPrices: SAMPLE_CRUSTS,
      activePromotions: [PROMO_PERCENT_ESPECIAIS],
    });

    // 10% of 62 = 6.20 (drink R$15 is NOT discounted)
    assert.equal(res.subtotal, 77);
    assert.equal(res.verifiedDiscount, 6.2);
    assert.equal(res.total, 70.8);
  });
});

describe("evaluateCartPromotions (Timezone & Best Benefit Selection)", () => {
  test("respects America/Sao_Paulo YYYY-MM-DD date window", () => {
    const datedPromo: Promotion = {
      ...PROMO_PERCENT_ESPECIAIS,
      start_date: "2026-11-24",
      end_date: "2026-11-25",
    };

    const menuRef = {
      pepperoni: { id: "pepperoni", name: "Pepperoni", price: 62, category: "especiais" },
    };

    // 2026-11-24T01:00:00Z is still 2026-11-23 22:00 in Sao Paulo -> not started yet
    const beforeStart = evaluateCartPromotions(
      { pepperoni: 1 },
      menuRef,
      [datedPromo],
      new Date("2026-11-24T01:00:00Z")
    );
    assert.equal(beforeStart, null);

    // 2026-11-24T15:00:00Z is 2026-11-24 12:00 in Sao Paulo -> active
    const duringWindow = evaluateCartPromotions(
      { pepperoni: 1 },
      menuRef,
      [datedPromo],
      new Date("2026-11-24T15:00:00Z")
    );
    assert.equal(duringWindow?.discountAmount, 6.2);
  });

  test("does not grant BUY_X_GET_Y reward when reward item is unavailable", () => {
    const menuRef = {
      calabresa: {
        id: "calabresa",
        name: "Calabresa",
        price: 46,
        category: "tradicionais",
        available: true,
      },
      "coca-2l": {
        id: "coca-2l",
        name: "Coca-Cola 2L",
        price: 15,
        category: "bebidas",
        available: false,
      },
    };
    const res = evaluateCartPromotions({ calabresa: 2 }, menuRef, [PROMO_BUY2_GET_COKE]);
    assert.equal(res, null);
  });
});

describe("Delivery Fee Matching & Thermal Printer HTML Escaping", () => {
  test("matches exact, accent-insensitive partial, fallback, and free (0) delivery fee", () => {
    const neighborhoods = [
      { id: "1", name: "Jardim São Lourenço", fee: 6 },
      { id: "2", name: "Centro", fee: 5 },
    ];

    assert.equal(matchDeliveryFee("Centro", neighborhoods, 0), 5);
    assert.equal(matchDeliveryFee("Jardim Sao Lourenco", neighborhoods, 0), 6);
    assert.equal(matchDeliveryFee("Bairro Desconhecido", neighborhoods, 0), 0);
    assert.equal(matchDeliveryFee("", neighborhoods, 0), 0);
  });

  test("escapes XSS payloads in thermal receipt fallback", () => {
    const payload = `<script>alert("xss")</script> & 'test'`;
    const escaped = escapeHtml(payload);
    assert.equal(
      escaped,
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39;"
    );
    assert.equal(escaped.includes("<script>"), false);
  });
});
