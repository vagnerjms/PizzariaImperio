import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { hashPassword, verifyPassword } from "../hash";
import { maskSettingsForAdminClient, SECRET_MASK_SENTINEL } from "../settings.server";
import {
  DEFAULT_ENABLED_DELIVERY_MODES,
  DEFAULT_ENABLED_PAYMENT_METHODS,
  DEFAULT_OPENING_HOURS,
} from "../store-hours";

describe("Phase 1 Security & Integrity Hardening", () => {
  test("async hashPassword and verifyPassword support scrypt random salts and legacy PBKDF2", async () => {
    const hash1 = await hashPassword("MinhaSenhaForte!2026");
    const hash2 = await hashPassword("MinhaSenhaForte!2026");

    assert.ok(hash1.includes(":"));
    assert.notEqual(hash1, hash2);
    assert.equal(await verifyPassword("MinhaSenhaForte!2026", hash1), true);
    assert.equal(await verifyPassword("SenhaErrada", hash1), false);

    // Legacy PBKDF2 compatibility
    const legacySalt = process.env.JWT_SECRET || "pizzaria_salt_123";
    const legacyHash = crypto
      .pbkdf2Sync("legacy-pass-123", legacySalt, 1000, 64, "sha512")
      .toString("hex");
    assert.equal(await verifyPassword("legacy-pass-123", legacyHash), true);
    assert.equal(await verifyPassword("wrong-pass", legacyHash), false);
  });

  test("maskSettingsForAdminClient never exposes plaintext API secrets to the browser", () => {
    const masked = maskSettingsForAdminClient({
      evolution_api_url: "https://evo.example.com",
      evolution_api_key: "super-secret-evo-key",
      n8n_webhook_url: "https://n8n.example.com/hook",
      mercado_pago_access_token: "APP_USR-123456-secret-token",
      mercado_pago_public_key: "APP_USR-public-key",
      whatsapp_instance_name: "Disparo",
      google_maps_api_key: "",
      store_phone: "5511999998888",
      store_status_override: "auto",
      pause_reason: "",
      opening_hours: { ...DEFAULT_OPENING_HOURS },
      enabled_payment_methods: { ...DEFAULT_ENABLED_PAYMENT_METHODS },
      enabled_delivery_modes: { ...DEFAULT_ENABLED_DELIVERY_MODES },
      meta_pixel_id: "1234567890",
      ga4_measurement_id: "G-TESTE12345",
    });

    assert.equal(masked.evolution_api_key, SECRET_MASK_SENTINEL);
    assert.equal(masked.mercado_pago_access_token, SECRET_MASK_SENTINEL);
    assert.equal(masked.google_maps_api_key, "");
    assert.equal(masked.mercado_pago_public_key, "APP_USR-public-key");
    assert.deepEqual(masked.configured_secrets, {
      evolution_api_key: true,
      mercado_pago_access_token: true,
      google_maps_api_key: false,
    });
  });
});
