import crypto from "node:crypto";

/**
 * Modern Cryptographic Password Hashing using scrypt + 16-byte Random Salt.
 * Format stored: `${salt}:${derivedKey}`
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Constant-time password verification with backward compatibility for legacy PBKDF2 hashes.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  // New scrypt format with random salt
  if (storedHash.includes(":")) {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;

    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    
    if (keyBuffer.length !== derivedKey.length) {
      return false;
    }
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  // Legacy PBKDF2 verification with constant-time comparison
  const legacySalt = process.env.JWT_SECRET || "pizzaria_salt_123";
  const legacyHash = crypto.pbkdf2Sync(password, legacySalt, 1000, 64, "sha512").toString("hex");
  
  const legacyBuffer = Buffer.from(legacyHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (legacyBuffer.length !== storedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(legacyBuffer, storedBuffer);
}
