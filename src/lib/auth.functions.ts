import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().trim(),
});

export const loginFn = createServerFn({ method: "POST" })
  .validator((raw: unknown) => loginSchema.parse(raw))
  .handler(async ({ data }) => {
    const { getUsersCollection } = await import("./db");
    const { verifyPassword } = await import("./hash");
    const { signToken } = await import("./jwt");

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({ email: data.email });
    
    if (!user) {
      throw new Error("Usuário ou senha incorretos.");
    }

    const isValid = await verifyPassword(data.password, user.password_hash);
    if (!isValid) {
      throw new Error("Usuário ou senha incorretos.");
    }

    const roles: string[] =
      Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [];

    if (roles.length === 0) {
      throw new Error("Conta sem permissões atribuídas. Contate o administrador.");
    }

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      roles,
    });

    return {
      token,
      email: user.email,
      roles,
    };
  });

export const getCurrentUserFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { extractAuthTokenFromRequest } = await import("./auth-middleware");
    const token = extractAuthTokenFromRequest(getRequest());
    if (!token) return null;

    const { verifyToken } = await import("./jwt");
    return verifyToken(token);
  });
