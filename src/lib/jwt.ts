import { SignJWT, jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET || "pizzaria_imperio_super_secret_jwt_key_2026";
const JWT_SECRET = new TextEncoder().encode(secretKey);

export async function signToken(payload: { userId: string; email: string; roles: string[] }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; email: string; roles: string[] };
  } catch (error) {
    return null;
  }
}
