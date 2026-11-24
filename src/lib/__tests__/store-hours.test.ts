import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import {
  DEFAULT_OPENING_HOURS,
  evaluateStoreOpenStatus,
  isDeliveryModeEnabled,
  isPaymentMethodEnabled,
} from "../store-hours";

describe("evaluateStoreOpenStatus (America/Sao_Paulo & Overrides)", () => {
  test("respects weekly schedule in America/Sao_Paulo timezone", () => {
    // Tuesday 2026-11-24 20:00 Sao Paulo = 2026-11-24T23:00:00Z -> OPEN (18:00-23:30)
    const openRes = evaluateStoreOpenStatus(
      {
        store_status_override: "auto",
        pause_reason: "",
        opening_hours: DEFAULT_OPENING_HOURS,
      },
      new Date("2026-11-24T23:00:00Z")
    );
    assert.equal(openRes.isOpen, true);

    // Tuesday 2026-11-24 14:00 Sao Paulo = 2026-11-24T17:00:00Z -> CLOSED
    const closedEarly = evaluateStoreOpenStatus(
      {
        store_status_override: "auto",
        pause_reason: "",
        opening_hours: DEFAULT_OPENING_HOURS,
      },
      new Date("2026-11-24T17:00:00Z")
    );
    assert.equal(closedEarly.isOpen, false);
    assert.equal(closedEarly.nextOpenLabel, "Hoje às 18:00");

    // Monday 2026-11-23 20:00 Sao Paulo = 2026-11-23T23:00:00Z -> CLOSED (Monday disabled by default)
    const closedMonday = evaluateStoreOpenStatus(
      {
        store_status_override: "auto",
        pause_reason: "",
        opening_hours: DEFAULT_OPENING_HOURS,
      },
      new Date("2026-11-23T23:00:00Z")
    );
    assert.equal(closedMonday.isOpen, false);
    assert.equal(closedMonday.nextOpenLabel, "Amanhã (Terça) às 18:00");
  });

  test("handles overnight schedules crossing midnight", () => {
    const overnightHours = {
      ...DEFAULT_OPENING_HOURS,
      "5": { enabled: true, open: "18:00", close: "01:00" }, // Friday 18:00 -> Saturday 01:00
    };

    // Saturday 2026-11-28 00:30 Sao Paulo = 2026-11-28T03:30:00Z -> still open from Friday's shift!
    const afterMidnight = evaluateStoreOpenStatus(
      {
        store_status_override: "auto",
        pause_reason: "",
        opening_hours: overnightHours,
      },
      new Date("2026-11-28T03:30:00Z")
    );
    assert.equal(afterMidnight.isOpen, true);

    // Saturday 2026-11-28 01:15 Sao Paulo = 2026-11-28T04:15:00Z -> closed
    const afterClose = evaluateStoreOpenStatus(
      {
        store_status_override: "auto",
        pause_reason: "",
        opening_hours: overnightHours,
      },
      new Date("2026-11-28T04:15:00Z")
    );
    assert.equal(afterClose.isOpen, false);
  });

  test("honors manual force_open and force_closed overrides", () => {
    // Monday afternoon forced open
    const forcedOpen = evaluateStoreOpenStatus(
      {
        store_status_override: "force_open",
        pause_reason: "",
        opening_hours: DEFAULT_OPENING_HOURS,
      },
      new Date("2026-11-23T15:00:00Z")
    );
    assert.equal(forcedOpen.isOpen, true);

    // Tuesday evening forced closed with custom reason
    const forcedClosed = evaluateStoreOpenStatus(
      {
        store_status_override: "force_closed",
        pause_reason: "Forno lotado — voltamos em 20 min",
        opening_hours: DEFAULT_OPENING_HOURS,
      },
      new Date("2026-11-24T23:00:00Z")
    );
    assert.equal(forcedClosed.isOpen, false);
    assert.equal(forcedClosed.reason, "Forno lotado — voltamos em 20 min");
  });
});

describe("Payment Method & Delivery Mode Switches", () => {
  test("validates enabled payment methods and delivery modes", () => {
    const payments = { pix: true, dinheiro: false, credito: true, debito: false };
    assert.equal(isPaymentMethodEnabled("Pix", payments), true);
    assert.equal(isPaymentMethodEnabled("Dinheiro", payments), false);
    assert.equal(isPaymentMethodEnabled("Cartão de crédito", payments), true);
    assert.equal(isPaymentMethodEnabled("Cartão de débito", payments), false);

    const modes = { delivery: true, pickup: false, dine_in: true };
    assert.equal(isDeliveryModeEnabled("delivery", modes), true);
    assert.equal(isDeliveryModeEnabled("pickup", modes), false);
    assert.equal(isDeliveryModeEnabled("dine_in", modes), true);
  });
});
