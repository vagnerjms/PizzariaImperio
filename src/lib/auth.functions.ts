import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUsersCollection } from "./db";
import { verifyPassword } from "./hash";
import { signToken } from "./jwt";

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().trim(),
});

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => loginSchema.parse(raw))
  .handler(async ({ data }) => {
    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({ email: data.email });
    
    if (!user) {
      throw new Error("Usuário ou senha incorretos.");
    }

    const isValid = verifyPassword(data.password, user.password_hash);
    if (!isValid) {
      throw new Error("Usuário ou senha incorretos.");
    }

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      roles: user.roles || ["admin"],
    });

    return {
      token,
      email: user.email,
      roles: user.roles || ["admin"],
    };
  });

export const getCurrentUserFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    if (!request) return null;

    let token = "";
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    } else {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/auth_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    if (!token) return null;

    const { verifyToken } = await import("./jwt");
    const payload = await verifyToken(token);
    return payload;
  });
