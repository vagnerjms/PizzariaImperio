import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { evaluateCartPromotions, validateCouponForCart } from "../promotions-engine";
import { calculateVerifiedOrderPricing, EffectiveMenuPriceEntry } from "../order-pricing";
import { Promotion } from "../promotions.types";
import { buildInitialCrustSeed, buildInitialMenuSeed, slugifyCatalogId } from "../menu-domain";
import { isValidGa4MeasurementId, isValidMetaPixelId } from "../analytics";
import { Pizza } from "@/data/catalog";

const MENU_SAMPLE: Record<string, EffectiveMenuPriceEntry> = {
  calabresa: { name: "Calabresa", price: 50, category: "tradicionais", available: true },
  pepperoni: { name: "Pepperoni", price: 60, category: "especiais", available: true },
};

const CRUST_SAMPLE = {
  nenhuma: { name: "Sem Borda", price: 0, available: true },
  catupiry: { name: "Borda Catupiry", price: 6, available: true },
  cheddar: { name: "Borda Cheddar", price: 7, available: false },
};

const COUPON_IMPERIO15: Promotion = {
  _id: "promo-coupon-15",
  title: "Cupom 15% OFF Terça/Quarta",
  description: "15% OFF usando cupom IMPERIO15",
  type: "PERCENTAGE_DISCOUNT",
  discount_value: 15,
  trigger_type: "min_total",
  trigger_min_total: 40,
  trigger_min_qty: 1,
  coupon_code: "IMPERIO15",
  days_of_week: [2, 3], // Terça e Quarta
  max_uses: 50,
  current_uses: 10,
  active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const AUTO_PROMO_5: Promotion = {
  _id: "promo-auto-5",
  title: "R$ 5 OFF Automático",
  description: "Desconto automático de R$ 5",
  type: "FIXED_DISCOUNT",
  discount_value: 5,
  trigger_type: "all",
  active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("Coupons, Weekdays & Usage Caps (Pacote 3)", () => {
  test("does not auto-apply coupon-gated promo and applies it when valid code is entered", () => {
    // Tuesday 2026-11-24 21:00 Sao Paulo = 2026-11-25T00:00:00Z (UTC is already Wednesday, SP is still Tuesday!)
    const tuesdayNightSP = new Date("2026-11-25T00:00:00Z");

    const autoOnly = evaluateCartPromotions(
      { calabresa: 1 },
      {
        calabresa: { id: "calabresa", name: "Calabresa", price: 50, category: "tradicionais" },
      },
      [COUPON_IMPERIO15, AUTO_PROMO_5],
      tuesdayNightSP,
    );
    assert.equal(autoOnly?.promotion._id, "promo-auto-5");
    assert.equal(autoOnly?.discountAmount, 5);

    // Entering coupon with lowercase/spaces applies coupon instead of automatic promo (non-stacking)
    const withCoupon = evaluateCartPromotions(
      { calabresa: 1 },
      {
        calabresa: { id: "calabresa", name: "Calabresa", price: 50, category: "tradicionais" },
      },
      [COUPON_IMPERIO15, AUTO_PROMO_5],
      tuesdayNightSP,
      "  imperio 15 ",
    );
    assert.equal(withCoupon?.promotion._id, "promo-coupon-15");
    assert.equal(withCoupon?.discountAmount, 7.5);
    assert.equal(withCoupon?.appliedViaCoupon, true);
  });

  test("rejects coupon on disallowed weekday and when max_uses is exhausted", () => {
    // Monday 2026-11-23 20:00 Sao Paulo = 2026-11-23T23:00:00Z (Monday = 1, coupon only allows [2, 3])
    const mondaySP = new Date("2026-11-23T23:00:00Z");
    const wrongDay = validateCouponForCart(
      "IMPERIO15",
      { calabresa: 1 },
      {
        calabresa: { id: "calabresa", name: "Calabresa", price: 50, category: "tradicionais" },
      },
      [COUPON_IMPERIO15],
      mondaySP,
    );
    assert.equal(wrongDay.valid, false);
    assert.ok(wrongDay.message.includes("Ter"));

    // Exhausted coupon
    const exhaustedPromo: Promotion = { ...COUPON_IMPERIO15, max_uses: 10, current_uses: 10 };
    const tuesdaySP = new Date("2026-11-24T23:00:00Z");
    const exhausted = validateCouponForCart(
      "IMPERIO15",
      { calabresa: 1 },
      {
        calabresa: { id: "calabresa", name: "Calabresa", price: 50, category: "tradicionais" },
      },
      [exhaustedPromo],
      tuesdaySP,
    );
    assert.equal(exhausted.valid, false);
    assert.ok(exhausted.message.includes("limite"));
  });

  test("server-side pricing enforces coupon validity and blocks unavailable dynamic crusts", () => {
    const tuesdaySP = new Date("2026-11-24T23:00:00Z");

    const priced = calculateVerifiedOrderPricing({
      items: [
        {
          pizza_id: "calabresa",
          crust_id: "catupiry",
          pizza_name: "Calabresa (Borda Catupiry)",
          quantity: 1,
          unit_price: 56,
        },
      ],
      deliveryMode: "pickup",
      officialDeliveryFee: 0,
      effectiveMenuPrices: MENU_SAMPLE,
      crustPrices: CRUST_SAMPLE,
      activePromotions: [COUPON_IMPERIO15],
      couponCode: "IMPERIO15",
      now: tuesdaySP,
    });

    // 50 + 6 = 56; 15% of 56 = 8.40 -> total 47.60
    assert.equal(priced.subtotal, 56);
    assert.equal(priced.verifiedDiscount, 8.4);
    assert.equal(priced.total, 47.6);
    assert.equal(priced.appliedCouponCode, "IMPERIO15");

    // Rejects unavailable crust ("cheddar" has available: false)
    assert.throws(
      () =>
        calculateVerifiedOrderPricing({
          items: [
            {
              pizza_id: "calabresa",
              crust_id: "cheddar",
              pizza_name: "Calabresa",
              quantity: 1,
              unit_price: 57,
            },
          ],
          deliveryMode: "pickup",
          officialDeliveryFee: 0,
          effectiveMenuPrices: MENU_SAMPLE,
          crustPrices: CRUST_SAMPLE,
          activePromotions: [],
          now: tuesdaySP,
        }),
      /temporariamente esgotada/,
    );

    // Rejects unknown coupon code explicitly submitted by client
    assert.throws(
      () =>
        calculateVerifiedOrderPricing({
          items: [
            {
              pizza_id: "calabresa",
              crust_id: "nenhuma",
              pizza_name: "Calabresa",
              quantity: 1,
              unit_price: 50,
            },
          ],
          deliveryMode: "pickup",
          officialDeliveryFee: 0,
          effectiveMenuPrices: MENU_SAMPLE,
          crustPrices: CRUST_SAMPLE,
          activePromotions: [COUPON_IMPERIO15],
          couponCode: "FAKE99",
          now: tuesdaySP,
        }),
      /não encontrado/,
    );
  });
});

describe("Dynamic Catalog Seed Migration & Tracking Pixels (Pacote 3)", () => {
  test("merges static catalog with legacy menu_overrides without losing price/badge/stock", () => {
    const staticMenu: Pizza[] = [
      {
        id: "calabresa",
        name: "Calabresa",
        desc: "Calabresa e cebola",
        ingredients: "Calabresa e cebola",
        price: 48,
        image: "/calabresa.jpg",
        category: "tradicionais",
        badge: "Mais pedida",
      },
      {
        id: "coca-2l",
        name: "Coca-Cola 2L",
        desc: "Refrigerante",
        ingredients: "Refrigerante",
        price: 15,
        image: "/coca.jpg",
        category: "bebidas",
      },
    ];

    const migrated = buildInitialMenuSeed(staticMenu, {
      calabresa: { price: 52.5, badge: "Chef", available: true },
      "coca-2l": { available: false },
    });

    assert.equal(migrated.length, 2);
    assert.equal(migrated[0].price, 52.5);
    assert.equal(migrated[0].badge, "Chef");
    assert.equal(migrated[0].available, true);
    assert.equal(migrated[1].price, 15);
    assert.equal(migrated[1].available, false);

    const crusts = buildInitialCrustSeed([
      { id: "nenhuma", name: "Sem Borda", price: 0 },
      { id: "catupiry", name: "Borda Catupiry", price: 5 },
    ]);
    assert.equal(crusts[0].available, true);
    assert.equal(crusts[1].sort_order, 1);

    assert.equal(
      slugifyCatalogId("Pizza Quatro Queijos Especial!"),
      "pizza-quatro-queijos-especial",
    );
  });

  test("validates Meta Pixel and GA4 Measurement IDs strictly against injection", () => {
    assert.equal(isValidMetaPixelId("123456789012345"), true);
    assert.equal(isValidMetaPixelId("1234<script>"), false);
    assert.equal(isValidMetaPixelId(""), false);

    assert.equal(isValidGa4MeasurementId("G-AB12CD34EF"), true);
    assert.equal(isValidGa4MeasurementId("UA-12345-1"), false);
    assert.equal(isValidGa4MeasurementId("G-1234';alert(1)//"), false);
  });
});
