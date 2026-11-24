import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import {
  buildCatastrophicErrorResponse,
  prefersJsonError,
  renderErrorPage,
} from "@/lib/error-page";
import { invalidateSystemSettingsCache } from "@/lib/settings.server";

describe("Fase 5 — Localized Error Page & Content Negotiation", () => {
  test("renderErrorPage retorna HTML pt-BR com identidade Pizzaria Império", () => {
    const html = renderErrorPage();
    assert.ok(html.includes('lang="pt-BR"'));
    assert.ok(html.includes("Pizzaria Império"));
    assert.ok(html.includes("Tentar novamente"));
  });

  test("prefersJsonError detecta /api/* e Accept: application/json corretamente", () => {
    const apiReq = new Request("http://localhost:3099/api/webhook", { method: "POST" });
    const jsonReq = new Request("http://localhost:3099/admin", {
      headers: { accept: "application/json" },
    });
    const browserReq = new Request("http://localhost:3099/", {
      headers: { accept: "text/html,application/xhtml+xml,application/json;q=0.9" },
    });

    assert.equal(prefersJsonError(apiReq), true);
    assert.equal(prefersJsonError(jsonReq), true);
    assert.equal(prefersJsonError(browserReq), false);
  });

  test("buildCatastrophicErrorResponse negocia JSON vs HTML conforme requisição", async () => {
    const apiRes = buildCatastrophicErrorResponse(new Request("http://localhost:3099/api/webhook"));
    assert.equal(apiRes.status, 500);
    assert.ok(apiRes.headers.get("content-type")?.includes("application/json"));
    const jsonBody = (await apiRes.json()) as { error?: string };
    assert.ok(jsonBody.error && jsonBody.error.includes("Erro interno"));

    const htmlRes = buildCatastrophicErrorResponse(
      new Request("http://localhost:3099/", { headers: { accept: "text/html" } }),
    );
    assert.equal(htmlRes.status, 500);
    assert.ok(htmlRes.headers.get("content-type")?.includes("text/html"));
    const htmlBody = await htmlRes.text();
    assert.ok(htmlBody.includes('lang="pt-BR"'));
  });

  test("invalidateSystemSettingsCache pode ser chamada de forma segura", () => {
    assert.doesNotThrow(() => invalidateSystemSettingsCache());
  });
});
