import crypto from "node:crypto";

const SALT = process.env.JWT_SECRET || "pizzaria_salt_123";

export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, SALT, 1000, 64, "sha512").toString("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
