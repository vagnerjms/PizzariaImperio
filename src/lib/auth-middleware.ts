import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { verifyToken } from "./jwt";

export type AppRole = "admin" | "supervisor" | "atendente";

/**
 * Extracts JWT token from Authorization Bearer header or bounded `auth_token` cookie.
 */
export function extractAuthTokenFromRequest(request: Request | null | undefined): string {
  if (!request?.headers) return "";
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return "";
}

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  if (!request?.headers) {
    throw new Error("Unauthorized: No request headers available");
  }

  const token = extractAuthTokenFromRequest(request);
  if (!token) {
    throw new Error("Unauthorized: No token provided");
  }

  const payload = await verifyToken(token);
  if (!payload) {
    throw new Error("Unauthorized: Invalid or expired token");
  }

  return next({
    context: {
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles,
    },
  });
});

export function createRoleMiddleware(
  allowedRoles: ReadonlyArray<AppRole>,
  errorMessage = "Acesso restrito."
) {
  return createMiddleware({ type: "function" })
    .middleware([requireAuth])
    .server(async ({ next, context }) => {
      const hasRole = Boolean(
        context.roles?.some((r) => (allowedRoles as ReadonlyArray<string>).includes(r))
      );
      if (!hasRole) {
        throw new Error(errorMessage);
      }
      return next();
    });
}

export const requireAdmin = createRoleMiddleware(
  ["admin"],
  "Acesso restrito a Administradores."
);

export const requireSupervisorOrAdmin = createRoleMiddleware(
  ["admin", "supervisor"],
  "Acesso restrito a Supervisores e Administradores."
);

export const requireStaff = createRoleMiddleware(
  ["admin", "supervisor", "atendente"],
  "Acesso restrito."
);
