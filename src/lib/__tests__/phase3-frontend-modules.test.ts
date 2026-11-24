import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { queryKeys } from "@/lib/query-keys";
import { toPrintableShift } from "@/lib/thermal-printer";
import type { CashShiftRow, CashShiftSummary } from "@/lib/cash-domain";

describe("Fase 3 — Query Keys Factory", () => {
  test("keys de domínio público e admin são determinísticas e distintas", () => {
    const keys = [
      queryKeys.public.catalog(),
      queryKeys.public.promotions(),
      queryKeys.public.storeConfig(),
      queryKeys.public.deliveryConfig(),
      queryKeys.admin.orders(),
      queryKeys.admin.couriers(),
      queryKeys.admin.courierSettlements("today"),
      queryKeys.admin.courierSettlements("7d"),
      queryKeys.admin.cashDashboard(),
      queryKeys.admin.financialReport("today"),
      queryKeys.admin.financialReport("30d"),
      queryKeys.admin.storeConfig(),
      queryKeys.admin.whatsappStatus(),
      queryKeys.admin.menuCatalog(),
      queryKeys.admin.settings(),
      queryKeys.admin.users(),
      queryKeys.admin.delivery(),
      queryKeys.admin.promotions(),
    ];

    const serialized = new Set(keys.map((k) => JSON.stringify(k)));
    assert.equal(serialized.size, keys.length);

    // Prefixos de invalidação devem casar com chaves parametrizadas
    assert.deepEqual(
      queryKeys.admin.financialReport("today").slice(0, 2),
      queryKeys.admin.financialReportAll(),
    );
    assert.deepEqual(
      queryKeys.admin.courierSettlements("shift").slice(0, 2),
      queryKeys.admin.courierSettlementsAll(),
    );
  });
});

describe("Fase 3 — Printer Adapter toPrintableShift", () => {
  test("usa summary live quando turno ainda está aberto (campos de fechamento nulos)", () => {
    const openShift: CashShiftRow = {
      id: "shift-open-001",
      status: "open",
      opened_by: "admin@pizzaria.com",
      opened_at: "2026-11-24T18:00:00.000Z",
      closed_by: null,
      closed_at: null,
      opening_balance: 150,
      movements: [
        {
          id: "mov-1",
          type: "suprimento",
          amount: 50,
          reason: "Troco",
          created_by: "admin@pizzaria.com",
          created_at: "2026-11-24T19:00:00.000Z",
        },
      ],
      expected_cash: null,
      counted_cash: null,
      cash_difference: null,
      gross_sales: null,
      total_orders: null,
      summary_by_payment: null,
      closing_notes: null,
    };

    const liveSummary: CashShiftSummary = {
      totalOrders: 4,
      canceledOrders: 1,
      grossSales: 320,
      totalDiscounts: 10,
      totalDeliveryFees: 20,
      byPayment: { pix: 120, dinheiro: 100, credito: 60, debito: 40, outros: 0 },
      totalSuprimentos: 50,
      totalSangrias: 0,
      expectedCash: 300,
      expectedTotalInShift: 520,
    };

    const printable = toPrintableShift(openShift, liveSummary);
    assert.equal(printable.id, "shift-open-001");
    assert.equal(printable.expected_cash, 300);
    assert.equal(printable.gross_sales, 320);
    assert.equal(printable.total_orders, 4);
    assert.equal(printable.by_payment.dinheiro, 100);
    assert.equal(printable.movements.length, 1);
    assert.equal(printable.movements[0].reason, "Troco");
  });

  test("prioriza snapshot persistido no turno fechado sobre summary", () => {
    const closedShift: CashShiftRow = {
      id: "shift-closed-002",
      status: "closed",
      opened_by: "admin@pizzaria.com",
      opened_at: "2026-11-24T18:00:00.000Z",
      closed_by: "admin@pizzaria.com",
      closed_at: "2026-11-24T23:00:00.000Z",
      opening_balance: 100,
      movements: [],
      expected_cash: 250,
      counted_cash: 245,
      cash_difference: -5,
      gross_sales: 400,
      total_orders: 6,
      summary_by_payment: { pix: 250, dinheiro: 150, credito: 0, debito: 0, outros: 0 },
      closing_notes: "Falta de R$ 5 no troco",
    };

    const printable = toPrintableShift(closedShift);
    assert.equal(printable.expected_cash, 250);
    assert.equal(printable.counted_cash, 245);
    assert.equal(printable.cash_difference, -5);
    assert.equal(printable.by_payment.pix, 250);
    assert.equal(printable.closing_notes, "Falta de R$ 5 no troco");
  });
});
