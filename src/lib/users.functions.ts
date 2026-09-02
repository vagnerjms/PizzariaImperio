import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { z } from "zod";

// 1. Listar Usuários (Apenas Admin)
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito a Administradores.");
    }
    const { getUsersCollection } = await import("./db");
    const usersCol = await getUsersCollection();
    const users = await usersCol.find({}).sort({ created_at: -1 }).toArray();

    return users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      roles: u.roles || ["atendente"],
      created_at: u.created_at || new Date(),
      updated_at: u.updated_at || new Date(),
    }));
  });

// 2. Cadastrar Novo Usuário (Apenas Admin)
const createUserSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["admin", "supervisor", "atendente"]),
});

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((raw: unknown) => createUserSchema.parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito a Administradores.");
    }
    const { getUsersCollection } = await import("./db");
    const { hashPassword } = await import("./hash");
    const usersCol = await getUsersCollection();

    const exists = await usersCol.findOne({ email: data.email });
    if (exists) {
      throw new Error("Já existe um usuário cadastrado com este e-mail.");
    }

    const hashedPassword = hashPassword(data.password);
    await usersCol.insertOne({
      email: data.email,
      password_hash: hashedPassword,
      roles: [data.role],
      created_at: new Date(),
      updated_at: new Date(),
    });

    return { success: true };
  });

// 3. Alterar Cargo / Permissão (Apenas Admin)
const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["admin", "supervisor", "atendente"]),
});

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((raw: unknown) => updateRoleSchema.parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito a Administradores.");
    }
    const { ObjectId } = await import("mongodb");
    const { getUsersCollection } = await import("./db");
    const usersCol = await getUsersCollection();

    let query: any;
    try {
      query = { _id: new ObjectId(data.userId) };
    } catch {
      query = { _id: data.userId };
    }

    const targetUser = await usersCol.findOne(query);
    if (!targetUser) {
      throw new Error("Usuário não encontrado.");
    }

    if (targetUser.email === context.email && data.role !== "admin") {
      throw new Error("Você não pode remover seu próprio privilégio de Administrador.");
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
  .middleware([requireAuth])
  .inputValidator((raw: unknown) => updatePasswordSchema.parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito a Administradores.");
    }
    const { ObjectId } = await import("mongodb");
    const { getUsersCollection } = await import("./db");
    const { hashPassword } = await import("./hash");
    const usersCol = await getUsersCollection();

    let query: any;
    try {
      query = { _id: new ObjectId(data.userId) };
    } catch {
      query = { _id: data.userId };
    }

    const hashedPassword = hashPassword(data.newPassword);
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
  .middleware([requireAuth])
  .inputValidator((raw: unknown) => deleteUserSchema.parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito a Administradores.");
    }
    const { ObjectId } = await import("mongodb");
    const { getUsersCollection } = await import("./db");
    const usersCol = await getUsersCollection();

    let query: any;
    try {
      query = { _id: new ObjectId(data.userId) };
    } catch {
      query = { _id: data.userId };
    }

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
        throw new Error("Operação bloqueada: não é permitido excluir o único Administrador ativo do sistema.");
      }
    }

    await usersCol.deleteOne(query);
    return { success: true };
  });
