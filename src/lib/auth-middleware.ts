import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { verifyToken } from "./jwt";

export const requireAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    let token = "";
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    } else {
      // Fallback to cookie
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/auth_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

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
  }
);
