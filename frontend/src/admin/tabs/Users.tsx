import { useEffect, useState, useCallback } from "react";
import { Search, UserPlus, RefreshCw, Trash2, Edit2, DollarSign } from "lucide-react";
import { adminApi, type AdminUser } from "../api";
import { Button, Badge, Modal, Input, Select, Card, Toast } from "../ui";

type ToastState = { msg: string; type: "success" | "error" } | null;

function roleBadge(role: string) {
  if (role === "superadmin") return "red";
  if (role === "admin") return "yellow";
  return "gray";
}

// ── Create User Modal ────────────────────────────────────────────────────────
function CreateUserModal({ token, onDone, onClose }: { token: string; onDone: () => void; onClose: () => void }) {
  const [form, setForm] = useState({ email: "", password: "", username: "", display_name: "", role: "user", balance: "50000" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true); setErr(null);
    try {
      await adminApi.createUser(token, {
        email: form.email, password: form.password,
        username: form.username || undefined,
        display_name: form.display_name || undefined,
        role: form.role, balance: Number(form.balance),
      });
      onDone();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Input label="Email *" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="user@example.com" />
      <Input label="Password *" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 8 chars, upper+lower+digit" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Username" value={form.username} onChange={e => set("username", e.target.value)} placeholder="optional" />
        <Input label="Display Name" value={form.display_name} onChange={e => set("display_name", e.target.value)} placeholder="optional" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Role" value={form.role} onChange={e => set("role", e.target.value)}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </Select>
        <Input label="Starting Balance (ZAR)" type="number" value={form.balance} onChange={e => set("balance", e.target.value)} />
      </div>
      {err && <p className="text-[12px] text-red-400">{err}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={loading} disabled={!form.email || !form.password}>Create User</Button>
      </div>
    </div>
  );
}

// ── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({ user, token, onDone, onClose }: { user: AdminUser; token: string; onDone: () => void; onClose: () => void }) {
  const [form, setForm] = useState({ display_name: user.display_name ?? "", role: user.role, balance: String(user.balance) });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true); setErr(null);
    try {
      await adminApi.patchUser(token, user.id, {
        role: form.role as AdminUser["role"],
        balance: Number(form.balance),
        display_name: form.display_name || undefined,
      });
      onDone();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-white/40">{user.email}</p>
      <Input label="Display Name" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
      <Select label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as AdminUser["role"] }))}>
        <option value="user">User</option>
        <option value="admin">Admin</option>
        <option value="superadmin">Super Admin</option>
      </Select>
      <Input label="Balance (ZAR)" type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
      {err && <p className="text-[12px] text-red-400">{err}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={loading}>Save</Button>
      </div>
    </div>
  );
}

// ── Main Users Tab ───────────────────────────────────────────────────────────
export function Users({ token, onSelectUser }: { token: string; onSelectUser: (u: AdminUser) => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { users } = await adminApi.getUsers(token);
      setUsers(users);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`Delete ${u.email}? This is irreversible.`)) return;
    try {
      await adminApi.deleteUser(token, u.id);
      showToast("User deleted", "success");
      load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const filtered = users.filter(u =>
    [u.email, u.username, u.display_name].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[18px] font-bold text-white">Users</h2>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search email / username…"
              className="w-52 rounded-lg border border-white/10 bg-[#0f1012] py-2 pl-8 pr-3 text-[12px] text-white placeholder-white/25 outline-none focus:border-[#e8173a]/60"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={load} loading={loading}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}><UserPlus className="h-3.5 w-3.5" /> New User</Button>
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-white/8 text-white/30">
              {["User", "Role", "Balance", "Win Control", "Created", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No users found</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e8173a] to-[#ff6b35] text-[10px] font-black text-white">
                      {(u.display_name ?? u.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{u.display_name ?? u.username ?? "—"}</p>
                      <p className="text-white/40">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge color={roleBadge(u.role)}>{u.role}</Badge></td>
                <td className="px-4 py-3 font-mono text-white">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-white/30" />
                    {u.balance.toLocaleString()}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.win_control ? (
                    <Badge color={u.win_control.win_mode === "win" ? "green" : u.win_control.win_mode === "loss" ? "red" : "gray"}>
                      {u.win_control.win_mode}
                    </Badge>
                  ) : <span className="text-white/25">—</span>}
                </td>
                <td className="px-4 py-3 text-white/40">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditUser(u)} aria-label="Edit user">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onSelectUser(u)} aria-label="Win controls">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2">
                        <path d="M12 20V10M18 20V4M6 20v-6" />
                      </svg>
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(u)} aria-label="Delete user">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New User">
        <CreateUserModal token={token} onDone={() => { setCreateOpen(false); showToast("User created", "success"); load(); }} onClose={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        {editUser && (
          <EditUserModal user={editUser} token={token}
            onDone={() => { setEditUser(null); showToast("User updated", "success"); load(); }}
            onClose={() => setEditUser(null)}
          />
        )}
      </Modal>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
