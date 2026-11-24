import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { extractAuthTokenFromRequest } from "../auth-middleware";
import { getSaoPauloDayOfWeek, getSaoPauloTodayStartDate, getSaoPauloYMD } from "../datetime";
import { normalizePaymentBucket, roundMoney } from "../money";
import { EscPosBuilder } from "../printer/escpos-builder";
import { buildCashShiftEscPosBuffer } from "../printer/cash-shift-receipt";
import { DEFAULT_PRINTER_SETTINGS } from "../printer/types";

describe("Phase 2 Modular Backend & Printer Primitives", () => {
  test("extractAuthTokenFromRequest parses Bearer header and bounded auth_token cookie safely", () => {
    const reqBearer = new Request("http://localhost/api", {
      headers: { authorization: "Bearer my-jwt-token" },
    });
    assert.equal(extractAuthTokenFromRequest(reqBearer), "my-jwt-token");

    // Must NOT match partial cookie name like `other_auth_token=...`
    const reqCookie = new Request("http://localhost/api", {
      headers: { cookie: "other_auth_token=wrong; auth_token=real%2Ejwt%2Etoken; foo=bar" },
    });
    assert.equal(extractAuthTokenFromRequest(reqCookie), "real.jwt.token");

    const reqPartialOnly = new Request("http://localhost/api", {
      headers: { cookie: "other_auth_token=wrong" },
    });
    assert.equal(extractAuthTokenFromRequest(reqPartialOnly), "");
  });

  test("datetime.ts computes America/Sao_Paulo calendar day, weekday, and start-of-day UTC instant", () => {
    // 2026-06-15 01:30:00Z is 2026-06-14 22:30:00 in America/Sao_Paulo (Sunday = 0)
    const dt = new Date("2026-06-15T01:30:00Z");
    assert.equal(getSaoPauloYMD(dt), "2026-06-14");
    assert.equal(getSaoPauloDayOfWeek(dt), 0);
    assert.equal(getSaoPauloTodayStartDate(dt).toISOString(), "2026-06-14T03:00:00.000Z");
  });

  test("money.ts rounds currency safely and normalizes payment buckets", () => {
    assert.equal(roundMoney(10.005), 10.01);
    assert.equal(normalizePaymentBucket("Cartão de crédito"), "credito");
    assert.equal(normalizePaymentBucket("Cartão de débito"), "debito");
    assert.equal(normalizePaymentBucket("PIX"), "pix");
    assert.equal(normalizePaymentBucket("Dinheiro"), "dinheiro");
  });

  test("EscPosBuilder and cash shift buffer emit beep and both standard + Bematech cut commands", () => {
    const buf = new EscPosBuilder("80mm")
      .init()
      .beep()
      .twoColumns("Subtotal:", "R$ 80,00")
      .feedAndCut(true, 2)
      .build();

    assert.equal(buf[0], 0x1b);
    assert.equal(buf[1], 0x40);
    // Ends with GS V 66 0 + ESC w (Bematech cut)
    assert.deepEqual(Array.from(buf.slice(-6)), [0x1d, 0x56, 0x42, 0x00, 0x1b, 0x77]);

    const shiftBuf = buildCashShiftEscPosBuffer(
      {
        id: "shift-abc12345",
        opened_by: "supervisor@pizzaria.com",
        opened_at: "2026-06-14T21:00:00.000Z",
        closed_by: "supervisor@pizzaria.com",
        closed_at: "2026-06-15T02:00:00.000Z",
        opening_balance: 100,
        expected_cash: 150,
        counted_cash: 150,
        cash_difference: 0,
        gross_sales: 200,
        total_orders: 3,
        by_payment: { pix: 100, dinheiro: 50, credito: 50, debito: 0 },
        movements: [],
      },
      DEFAULT_PRINTER_SETTINGS,
    );
    assert.deepEqual(Array.from(shiftBuf.slice(-6)), [0x1d, 0x56, 0x42, 0x00, 0x1b, 0x77]);
  });
});
