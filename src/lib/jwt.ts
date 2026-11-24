import { SignJWT, jwtVerify } from "jose";

function getJwtSecret(): Uint8Array {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing JWT_SECRET environment variable in production.");
    }
    return new TextEncoder().encode("dev_only_local_jwt_secret_do_not_use_in_prod");
  }
  return new TextEncoder().encode(secretKey);
}

export async function signToken(payload: { userId: string; email: string; roles: string[] }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as { userId: string; email: string; roles: string[] };
  } catch (error) {
    return null;
  }
}
