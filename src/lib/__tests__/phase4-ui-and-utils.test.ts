import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { isPizzaCategory, sanitizeText } from "@/lib/formatters";
import {
  DEFAULT_OPENING_HOURS,
  formatOpeningHoursSummary,
  OpeningHoursMap,
} from "@/lib/store-hours";

describe("Fase 4 — Shared Formatters & Guards", () => {
  test("isPizzaCategory identifica corretamente sabores de pizza vs bebidas/brotos/adicionais", () => {
    assert.equal(isPizzaCategory("tradicionais"), true);
    assert.equal(isPizzaCategory("especiais"), true);
    assert.equal(isPizzaCategory("doces"), true);
    assert.equal(isPizzaCategory("doces-especiais"), true);

    assert.equal(isPizzaCategory("bebidas"), false);
    assert.equal(isPizzaCategory("brotos"), false);
    assert.equal(isPizzaCategory("adicionais"), false);
    assert.equal(isPizzaCategory("todas"), false);
    assert.equal(isPizzaCategory(undefined), false);
  });

  test("sanitizeText remove caracteres de controle ASCII, aplica limite e trim", () => {
    const dirty = "  \u0000Calabresa\u0007 Especial\u001F\u007F  ";
    assert.equal(sanitizeText(dirty), "Calabresa Especial");
    assert.equal(sanitizeText(dirty, 11), "Calabresa");
    assert.equal(sanitizeText(""), "");
  });
});

describe("Fase 4 — Dynamic Opening Hours Summary", () => {
  test("formata o horário padrão de terça a domingo", () => {
    const summary = formatOpeningHoursSummary(DEFAULT_OPENING_HOURS);
    assert.equal(summary, "de terça a domingo das 18h às 23h30");
  });

  test("agrupa múltiplos intervalos distintos na semana", () => {
    const custom: OpeningHoursMap = {
      "1": { enabled: false, open: "18:00", close: "23:00" },
      "2": { enabled: true, open: "18:00", close: "23:00" },
      "3": { enabled: true, open: "18:00", close: "23:00" },
      "4": { enabled: true, open: "18:00", close: "23:00" },
      "5": { enabled: true, open: "18:00", close: "00:30" },
      "6": { enabled: true, open: "18:00", close: "00:30" },
      "0": { enabled: true, open: "17:30", close: "22:30" },
    };

    const summary = formatOpeningHoursSummary(custom);
    assert.equal(
      summary,
      "de terça a quinta das 18h às 23h · sexta e sábado das 18h às 0h30 · domingo das 17h30 às 22h30",
    );
  });

  test("retorna fallback amigável quando nenhum dia está habilitado", () => {
    const allClosed: OpeningHoursMap = {
      "0": { enabled: false, open: "18:00", close: "23:00" },
      "1": { enabled: false, open: "18:00", close: "23:00" },
      "2": { enabled: false, open: "18:00", close: "23:00" },
      "3": { enabled: false, open: "18:00", close: "23:00" },
      "4": { enabled: false, open: "18:00", close: "23:00" },
      "5": { enabled: false, open: "18:00", close: "23:00" },
      "6": { enabled: false, open: "18:00", close: "23:00" },
    };
    assert.equal(formatOpeningHoursSummary(allClosed), "consulte nossos horários pelo WhatsApp");
  });
});
