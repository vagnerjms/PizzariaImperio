import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./auth-middleware";
import { z } from "zod";

async function buildUserIdQuery(userId: string): Promise<Record<string, unknown>> {
  const { ObjectId } = await import("mongodb");
  try {
    return { _id: new ObjectId(userId) };
  } catch {
    return { _id: userId };
  }
}

function toIsoDate(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return val;
  return new Date().toISOString();
}

// 1. Listar Usuários (Apenas Admin)
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { getUsersCollection } = await import("./db");
    const usersCol = await getUsersCollection();
    const users = await usersCol.find({}).sort({ created_at: -1 }).toArray();

    return users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      roles: u.roles || ["atendente"],
      created_at: toIsoDate(u.created_at),
      updated_at: toIsoDate(u.updated_at),
    }));
  });

// 2. Cadastrar Novo Usuário (Apenas Admin)
const createUserSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["admin", "supervisor", "atendente"]),
});

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((raw: unknown) => createUserSchema.parse(raw))
  .handler(async ({ data }) => {
    const { getUsersCollection } = await import("./db");
    const { hashPassword } = await import("./hash");
    const usersCol = await getUsersCollection();

    const exists = await usersCol.findOne({ email: data.email });
    if (exists) {
      throw new Error("Já existe um usuário cadastrado com este e-mail.");
    }

    const hashedPassword = await hashPassword(data.password);
    try {
      await usersCol.insertOne({
        email: data.email,
        password_hash: hashedPassword,
        roles: [data.role],
        created_at: new Date(),
        updated_at: new Date(),
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new Error("Já existe um usuário cadastrado com este e-mail.");
      }
      throw err;
    }

    return { success: true };
  });

// 3. Alterar Cargo / Permissão (Apenas Admin)
const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["admin", "supervisor", "atendente"]),
});

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((raw: unknown) => updateRoleSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { getUsersCollection } = await import("./db");
    const usersCol = await getUsersCollection();
    const query = await buildUserIdQuery(data.userId);

    const targetUser = await usersCol.findOne(query);
    if (!targetUser) {
      throw new Error("Usuário não encontrado.");
    }

    if (targetUser.email === context.email && data.role !== "admin") {
      throw new Error("Você não pode remover seu próprio privilégio de Administrador.");
    }

    if (targetUser.roles?.includes("admin") && data.role !== "admin") {
      const adminCount = await usersCol.countDocuments({ roles: "admin" });
      if (adminCount <= 1) {
        throw new Error(
          "Operação bloqueada: não é permitido rebaixar o único Administrador ativo do sistema.",
        );
      }
    }

    await usersCol.updateOne(query, {
      $set: {
        roles: [data.role],
        updated_at: new Date(),
      },
    });

    return { success: true };
  });

// 4. Alterar Senha de Usuário (Apenas Admin)
const updatePasswordSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
});

export const updateUserPassword = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((raw: unknown) => updatePasswordSchema.parse(raw))
  .handler(async ({ data }) => {
    const { getUsersCollection } = await import("./db");
    const { hashPassword } = await import("./hash");
    const usersCol = await getUsersCollection();
    const query = await buildUserIdQuery(data.userId);

    const hashedPassword = await hashPassword(data.newPassword);
    const result = await usersCol.updateOne(query, {
      $set: {
        password_hash: hashedPassword,
        updated_at: new Date(),
      },
    });

    if (result.matchedCount === 0) {
      throw new Error("Usuário não encontrado.");
    }

    return { success: true };
  });

// 5. Excluir Usuário (Apenas Admin)
const deleteUserSchema = z.object({
  userId: z.string(),
});

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((raw: unknown) => deleteUserSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { getUsersCollection } = await import("./db");
    const usersCol = await getUsersCollection();
    const query = await buildUserIdQuery(data.userId);

    const targetUser = await usersCol.findOne(query);
    if (!targetUser) {
      throw new Error("Usuário não encontrado.");
    }

    if (targetUser.email === context.email) {
      throw new Error("Você não pode excluir a sua própria conta logada.");
    }

    if (targetUser.roles?.includes("admin")) {
      const adminCount = await usersCol.countDocuments({ roles: "admin" });
      if (adminCount <= 1) {
        throw new Error(
          "Operação bloqueada: não é permitido excluir o único Administrador ativo do sistema.",
        );
      }
    }

    await usersCol.deleteOne(query);
    return { success: true };
  });
