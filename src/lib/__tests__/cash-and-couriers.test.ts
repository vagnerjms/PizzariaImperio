import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import {
  calculateCashClosingDifference,
  calculateCashShiftSummary,
  isOrderEligibleForCash,
} from "../cash-domain";
import {
  calculateCourierSettlements,
  calculateOrderCourierPayout,
  UNASSIGNED_COURIER_ID,
} from "../couriers-domain";
import {
  buildCashShiftEscPosBuffer,
  buildCashShiftReceiptHtml,
  DEFAULT_PRINTER_SETTINGS,
} from "../thermal-printer";

describe("PDV Cash Shift Calculations (cash-domain)", () => {
  test("computes expected drawer cash, payment breakdown, and ignores canceled/unpaid Pix", () => {
    const summary = calculateCashShiftSummary(
      150, // opening balance
      [
        { type: "suprimento", amount: 50 },
        { type: "sangria", amount: 30 },
        { type: "sangria", amount: 25.5 },
      ],
      [
        {
          status: "entregue",
          payment_method: "Dinheiro",
          payment_status: "on_delivery",
          total: 80,
          discount: 0,
          delivery_fee: 8,
        },
        {
          status: "preparando",
          payment_method: "Pix",
          payment_status: "paid",
          total: 120,
          discount: 10,
          delivery_fee: 5,
        },
        {
          status: "novo",
          payment_method: "Pix",
          payment_status: "pending", // must NOT count!
          total: 99,
          discount: 0,
          delivery_fee: 5,
        },
        {
          status: "cancelado", // must NOT count!
          payment_method: "Dinheiro",
          payment_status: "on_delivery",
          total: 60,
          discount: 0,
          delivery_fee: 5,
        },
        {
          status: "entregue",
          payment_method: "Cartão de crédito",
          payment_status: "on_delivery",
          total: 64.5,
          discount: 0,
          delivery_fee: 0,
        },
      ],
    );

    assert.equal(summary.totalOrders, 3);
    assert.equal(summary.canceledOrders, 1);
    assert.equal(summary.byPayment.dinheiro, 80);
    assert.equal(summary.byPayment.pix, 120);
    assert.equal(summary.byPayment.credito, 64.5);
    assert.equal(summary.byPayment.debito, 0);
    assert.equal(summary.grossSales, 264.5);
    assert.equal(summary.totalDiscounts, 10);
    assert.equal(summary.totalDeliveryFees, 13);
    assert.equal(summary.totalSuprimentos, 50);
    assert.equal(summary.totalSangrias, 55.5);
    // expectedCash = 150 + 80 + 50 - 55.5 = 224.5
    assert.equal(summary.expectedCash, 224.5);
  });

  test("calculates closing difference accurately (batido, sobra, falta)", () => {
    assert.equal(calculateCashClosingDifference(224.5, 224.5), 0);
    assert.equal(calculateCashClosingDifference(224.5, 230), 5.5);
    assert.equal(calculateCashClosingDifference(224.5, 210.25), -14.25);

    assert.equal(
      isOrderEligibleForCash({
        status: "novo",
        payment_method: "Pix",
        payment_status: "pending",
      }),
      false,
    );
    assert.equal(
      isOrderEligibleForCash({
        status: "novo",
        payment_method: "Pix",
        payment_status: "paid",
      }),
      true,
    );
  });
});

describe("Courier Payout & Shift Settlement (couriers-domain)", () => {
  test("supports 100% delivery fee, partial percentage, and fixed payout per delivery", () => {
    assert.equal(
      calculateOrderCourierPayout(10, {
        payout_mode: "delivery_fee",
        fee_share_percent: 100,
        fixed_fee: 0,
      }),
      10,
    );
    assert.equal(
      calculateOrderCourierPayout(10, {
        payout_mode: "delivery_fee",
        fee_share_percent: 80,
        fixed_fee: 0,
      }),
      8,
    );
    assert.equal(
      calculateOrderCourierPayout(12, {
        payout_mode: "fixed",
        fee_share_percent: 100,
        fixed_fee: 7.5,
      }),
      7.5,
    );
  });

  test("groups deliveries, payout due, cash to return, change carried, and avg SLA per courier", () => {
    const couriers = [
      {
        id: "c1",
        name: "Carlos",
        payout_mode: "delivery_fee" as const,
        fee_share_percent: 100,
        fixed_fee: 0,
      },
      {
        id: "c2",
        name: "Bruno",
        payout_mode: "fixed" as const,
        fee_share_percent: 100,
        fixed_fee: 7,
      },
    ];

    const settlements = calculateCourierSettlements(
      [
        {
          delivery_mode: "delivery",
          status: "entregue",
          payment_method: "Dinheiro",
          payment_status: "on_delivery",
          total: 72,
          troco: 100, // change carried = 28
          delivery_fee: 8,
          courier_id: "c1",
          courier_name: "Carlos",
          courier_payout: 8,
          created_at: "2026-11-24T22:00:00Z",
          dispatched_at: "2026-11-24T22:20:00Z",
          delivered_at: "2026-11-24T22:35:00Z", // 15 min
        },
        {
          delivery_mode: "delivery",
          status: "saiu",
          payment_method: "Pix",
          payment_status: "paid",
          total: 60,
          troco: null,
          delivery_fee: 10,
          courier_id: "c1",
          courier_name: "Carlos",
          courier_payout: 10,
          created_at: "2026-11-24T22:30:00Z",
          dispatched_at: "2026-11-24T22:45:00Z",
          delivered_at: null,
        },
        {
          delivery_mode: "delivery",
          status: "entregue",
          payment_method: "Dinheiro",
          payment_status: "on_delivery",
          total: 55,
          troco: null,
          delivery_fee: 12,
          courier_id: "c2",
          courier_name: "Bruno",
          courier_payout: null, // falls back to courier fixed rule (7)
          created_at: "2026-11-24T22:00:00Z",
          dispatched_at: "2026-11-24T22:10:00Z",
          delivered_at: "2026-11-24T22:30:00Z", // 20 min
        },
        {
          delivery_mode: "pickup", // pickup must NOT appear in courier settlements
          status: "entregue",
          payment_method: "Dinheiro",
          payment_status: "on_delivery",
          total: 50,
          troco: null,
          delivery_fee: 0,
          courier_id: null,
          courier_name: null,
          courier_payout: null,
          created_at: "2026-11-24T22:00:00Z",
          dispatched_at: null,
          delivered_at: "2026-11-24T22:15:00Z",
        },
        {
          delivery_mode: "delivery",
          status: "entregue",
          payment_method: "Cartão de débito",
          payment_status: "on_delivery",
          total: 80,
          troco: null,
          delivery_fee: 6,
          courier_id: null, // unassigned own delivery
          courier_name: null,
          courier_payout: null,
          created_at: "2026-11-24T22:00:00Z",
          dispatched_at: "2026-11-24T22:20:00Z",
          delivered_at: "2026-11-24T22:40:00Z",
        },
      ],
      couriers,
    );

    assert.equal(settlements.length, 3);

    const carlos = settlements.find((s) => s.courierId === "c1")!;
    assert.equal(carlos.deliveriesCount, 2);
    assert.equal(carlos.deliveredCount, 1);
    assert.equal(carlos.inTransitCount, 1);
    assert.equal(carlos.payoutDue, 18);
    assert.equal(carlos.cashToReturn, 72);
    assert.equal(carlos.totalChangeCarried, 28);
    assert.equal(carlos.avgDeliveryMinutes, 15);

    const bruno = settlements.find((s) => s.courierId === "c2")!;
    assert.equal(bruno.deliveriesCount, 1);
    assert.equal(bruno.payoutDue, 7);
    assert.equal(bruno.totalDeliveryFeesCollected, 12);
    assert.equal(bruno.cashToReturn, 55);
    assert.equal(bruno.avgDeliveryMinutes, 20);

    const unassigned = settlements.find((s) => s.courierId === UNASSIGNED_COURIER_ID)!;
    assert.equal(unassigned.deliveriesCount, 1);
    assert.equal(unassigned.payoutDue, 0);
  });
});

describe("Cash Shift Thermal Receipt Printing", () => {
  test("generates ESC/POS buffer and escapes HTML payloads in fallback receipt", () => {
    const sampleShift = {
      id: "shift-abc12345",
      opened_by: "supervisor@pizzaria.com",
      opened_at: "2026-11-24T21:00:00Z",
      closed_by: "supervisor@pizzaria.com",
      closed_at: "2026-11-25T02:00:00Z",
      opening_balance: 100,
      expected_cash: 180,
      counted_cash: 175,
      cash_difference: -5,
      gross_sales: 320,
      total_orders: 5,
      by_payment: { pix: 120, dinheiro: 100, credito: 60, debito: 40 },
      movements: [
        { type: "sangria" as const, amount: 20, reason: "<script>alert(1)</script> Gás" },
      ],
      closing_notes: "<b>Falta de R$ 5</b>",
    };

    const escPos = buildCashShiftEscPosBuffer(sampleShift, DEFAULT_PRINTER_SETTINGS);
    assert.ok(escPos.length > 100);

    const html = buildCashShiftReceiptHtml(sampleShift, DEFAULT_PRINTER_SETTINGS);
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.ok(html.includes("DIFERENÇA (FALTA)"));
  });
});
