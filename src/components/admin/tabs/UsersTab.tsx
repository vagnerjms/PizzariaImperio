import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  UserPlus,
  Loader2,
  KeyRound,
  Trash2,
} from "lucide-react";
import {
  listUsers,
  createUser,
  updateUserRole,
  updateUserPassword,
  deleteUser,
} from "@/lib/users.functions";

export function UsersTab({
  currentUser,
}: {
  currentUser: { email: string; roles: string[] };
}) {
  const fetchUsersFn = useServerFn(listUsers);
  const createUserFn = useServerFn(createUser);
  const updateUserRoleFn = useServerFn(updateUserRole);
  const updateUserPasswordFn = useServerFn(updateUserPassword);
  const deleteUserFn = useServerFn(deleteUser);

  const [usersList, setUsersList] = useState<
    Array<{ id: string; email: string; roles: string[]; created_at: string | Date }>
  >([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersActionLoading, setUsersActionLoading] = useState(false);
  const [usersSuccessMsg, setUsersSuccessMsg] = useState<string | null>(null);
  const [usersErrorMsg, setUsersErrorMsg] = useState<string | null>(null);

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "supervisor" | "atendente">("atendente");

  const [passwordModalUser, setPasswordModalUser] = useState<{ id: string; email: string } | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");

  const loadUsers = async () => {
    if (!currentUser?.roles?.includes("admin")) return;
    setUsersLoading(true);
    setUsersErrorMsg(null);
    try {
      const data = await fetchUsersFn();
      setUsersList(data);
    } catch (e) {
      setUsersErrorMsg(e instanceof Error ? e.message : "Erro ao carregar usuários.");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsersActionLoading(true);
    setUsersErrorMsg(null);
    setUsersSuccessMsg(null);
    try {
      await createUserFn({
        data: {
          email: newUserEmail.trim(),
          password: newUserPassword.trim(),
          role: newUserRole,
        },
      });
      setUsersSuccessMsg(`Usuário ${newUserEmail} cadastrado com sucesso!`);
      setShowCreateUserModal(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("atendente");
      loadUsers();
      setTimeout(() => setUsersSuccessMsg(null), 4000);
    } catch (err) {
      setUsersErrorMsg(err instanceof Error ? err.message : "Erro ao cadastrar usuário.");
    } finally {
      setUsersActionLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: "admin" | "supervisor" | "atendente") => {
    setUsersActionLoading(true);
    setUsersErrorMsg(null);
    setUsersSuccessMsg(null);
    try {
      await updateUserRoleFn({
        data: { userId, role: newRole },
      });
      setUsersSuccessMsg("Permissão atualizada com sucesso!");
      loadUsers();
      setTimeout(() => setUsersSuccessMsg(null), 4000);
    } catch (err) {
      setUsersErrorMsg(err instanceof Error ? err.message : "Erro ao alterar permissão.");
    } finally {
      setUsersActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    setUsersActionLoading(true);
    setUsersErrorMsg(null);
    setUsersSuccessMsg(null);
    try {
      await updateUserPasswordFn({
        data: {
          userId: passwordModalUser.id,
          newPassword: newPasswordValue.trim(),
        },
      });
      setUsersSuccessMsg(`Senha do usuário ${passwordModalUser.email} alterada com sucesso!`);
      setPasswordModalUser(null);
      setNewPasswordValue("");
      setTimeout(() => setUsersSuccessMsg(null), 4000);
    } catch (err) {
      setUsersErrorMsg(err instanceof Error ? err.message : "Erro ao alterar senha.");
    } finally {
      setUsersActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${email}?`)) return;
    setUsersActionLoading(true);
    setUsersErrorMsg(null);
    setUsersSuccessMsg(null);
    try {
      await deleteUserFn({
        data: { userId },
      });
      setUsersSuccessMsg(`Usuário ${email} excluído com sucesso!`);
      loadUsers();
      setTimeout(() => setUsersSuccessMsg(null), 4000);
    } catch (err) {
      setUsersErrorMsg(err instanceof Error ? err.message : "Erro ao excluir usuário.");
    } finally {
      setUsersActionLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <header className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gold/10 p-2.5 text-gold">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg leading-tight">Gestão de Usuários e Permissões</h2>
              <p className="text-xs text-muted-foreground">Cadastre novos operadores, configure cargos e redefina senhas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateUserModal(true)}
            className="rounded-full bg-gold px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" /> Novo Usuário
          </button>
        </header>

        {usersLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-gold mb-3" />
            <p className="text-sm">Carregando usuários...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {usersErrorMsg && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                {usersErrorMsg}
              </div>
            )}
            {usersSuccessMsg && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs text-green-500 font-semibold">
                {usersSuccessMsg}
              </div>
            )}

            {/* Modal / Card para Cadastrar Novo Usuário */}
            {showCreateUserModal && (
              <form onSubmit={handleCreateUser} className="rounded-2xl border border-gold/40 bg-gold/5 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4" /> Cadastrar Novo Usuário
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail</label>
                    <input
                      type="email"
                      required
                      placeholder="usuario@pizzaria.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha Inicial</label>
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nível / Cargo</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                    >
                      <option value="atendente">Atendente (Apenas Pedidos)</option>
                      <option value="supervisor">Supervisor (WhatsApp + Taxas + Indicadores)</option>
                      <option value="admin">Administrador (Acesso Total)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={usersActionLoading || !newUserEmail.trim() || newUserPassword.length < 6}
                    className="rounded-full bg-gold px-5 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow transition hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {usersActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Salvar Usuário
                  </button>
                </div>
              </form>
            )}

            {/* Modal de Alteração de Senha */}
            {passwordModalUser && (
              <form onSubmit={handleChangePassword} className="rounded-2xl border border-blue-500/40 bg-blue-500/5 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4" /> Alterar Senha de {passwordModalUser.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="max-w-md">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Digite a nova senha (mínimo 6 caracteres)"
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={usersActionLoading || newPasswordValue.length < 6}
                    className="rounded-full bg-blue-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {usersActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirmar Nova Senha
                  </button>
                </div>
              </form>
            )}

            {/* Tabela de Usuários Cadastrados */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border/80 bg-secondary/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">E-mail</th>
                      <th className="px-4 py-3">Cargo / Nível</th>
                      <th className="px-4 py-3">Data de Cadastro</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {usersList.map((u) => {
                      const isSuperAdmin = u.email === "admin@pizzaria.com" || u.email === currentUser?.email;
                      const role = u.roles?.includes("admin") ? "admin" : u.roles?.includes("supervisor") ? "supervisor" : "atendente";
                      return (
                        <tr key={u.id} className="hover:bg-secondary/10 transition">
                          <td className="px-4 py-3 font-medium text-foreground">
                            {u.email}
                            {u.email === currentUser?.email && (
                              <span className="ml-2 text-[10px] bg-gold/15 text-gold px-2 py-0.5 rounded-full font-bold">
                                Você
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={role}
                              onChange={(e) => handleUpdateUserRole(u.id, e.target.value as any)}
                              disabled={usersActionLoading}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider focus:outline-none ${
                                role === "admin"
                                  ? "border-gold/50 bg-gold/10 text-gold"
                                  : role === "supervisor"
                                  ? "border-blue-400/50 bg-blue-400/10 text-blue-400"
                                  : "border-border bg-secondary text-muted-foreground"
                              }`}
                            >
                              <option value="atendente">Atendente</option>
                              <option value="supervisor">Supervisor</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setPasswordModalUser({ id: u.id, email: u.email });
                                  setNewPasswordValue("");
                                }}
                                title="Alterar Senha"
                                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                              >
                                <KeyRound className="h-4 w-4" />
                              </button>
                              {!isSuperAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  title="Excluir Usuário"
                                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
