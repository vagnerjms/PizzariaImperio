import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);
const pbkdf2Async = promisify(crypto.pbkdf2);

/**
 * Modern Cryptographic Password Hashing using non-blocking async scrypt + 16-byte Random Salt.
 * Format stored: `${salt}:${derivedKey}`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Constant-time async password verification with backward compatibility for legacy PBKDF2 hashes.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;

  // New scrypt format with random salt
  if (storedHash.includes(":")) {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;

    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

    if (keyBuffer.length !== derivedKey.length) {
      return false;
    }
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  // Legacy PBKDF2 verification with constant-time comparison
  const legacySalt = process.env.JWT_SECRET || "pizzaria_salt_123";
  const legacyDerived = (await pbkdf2Async(password, legacySalt, 1000, 64, "sha512")) as Buffer;
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (legacyDerived.length !== storedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(legacyDerived, storedBuffer);
}
