import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Users, Activity, RefreshCw } from "lucide-react";
import { adminApi, type AdminStats } from "../api";
import { StatCard, Card, CardTitle, Button, Badge } from "../ui";

function crashColor(v: number) {
  if (v < 1.5) return "red";
  if (v < 2.0) return "yellow";
  return "green";
}

export function Dashboard({ token }: { token: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { stats } = await adminApi.getStats(token);
      setStats(stats);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-white">Dashboard</h2>
        <Button variant="ghost" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Users"    value={stats?.total_users ?? "—"}  sub="registered accounts" />
        <StatCard label="Total Balance"  value={stats ? `R${stats.total_balance.toLocaleString()}` : "—"} sub="across all wallets" />
        <StatCard label="Rounds Today"   value={stats?.rounds_today ?? "—"} sub="last 24 h" />
        <StatCard label="Avg Crash"      value={stats ? `${stats.avg_crash}×` : "—"} sub="last 100 rounds" />
      </div>

      <Card>
        <CardTitle>Recent Rounds</CardTitle>
        {!stats ? (
          <p className="text-[13px] text-white/30">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-white/8 text-white/30">
                  <th className="pb-2 text-left font-medium">Round ID</th>
                  <th className="pb-2 text-left font-medium">Crash Point</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                  <th className="pb-2 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_rounds.map((r) => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-2 font-mono text-white/40">{r.id.slice(0, 8)}…</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1.5">
                        {Number(r.crash_point) < 2
                          ? <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                          : <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                        }
                        <span className="font-bold text-white">{Number(r.crash_point).toFixed(2)}×</span>
                      </div>
                    </td>
                    <td className="py-2">
                      <Badge color={crashColor(Number(r.crash_point))}>{r.status}</Badge>
                    </td>
                    <td className="py-2 text-white/30">
                      {r.ended_at ? new Date(r.ended_at).toLocaleTimeString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" /> Quick Info
            </div>
          </CardTitle>
          <ul className="space-y-2 text-[13px] text-white/60">
            <li className="flex justify-between"><span>Total Registered</span><span className="font-semibold text-white">{stats?.total_users ?? "—"}</span></li>
            <li className="flex justify-between"><span>House Balance</span><span className="font-semibold text-white">{stats ? `R${stats.total_balance.toLocaleString()}` : "—"}</span></li>
            <li className="flex justify-between"><span>Rounds Today</span><span className="font-semibold text-white">{stats?.rounds_today ?? "—"}</span></li>
          </ul>
        </Card>
        <Card>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" /> Crash Distribution
            </div>
          </CardTitle>
          {stats ? (
            <div className="space-y-2 text-[12px]">
              {(["< 1.5×", "1.5–2×", "2–5×", "> 5×"] as const).map((label, i) => {
                const counts = [
                  stats.recent_rounds.filter(r => Number(r.crash_point) < 1.5).length,
                  stats.recent_rounds.filter(r => Number(r.crash_point) >= 1.5 && Number(r.crash_point) < 2).length,
                  stats.recent_rounds.filter(r => Number(r.crash_point) >= 2 && Number(r.crash_point) < 5).length,
                  stats.recent_rounds.filter(r => Number(r.crash_point) >= 5).length,
                ];
                const total = stats.recent_rounds.length || 1;
                const pct = Math.round((counts[i] / total) * 100);
                return (
                  <div key={label}>
                    <div className="mb-0.5 flex justify-between text-white/50">
                      <span>{label}</span><span>{counts[i]}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/8">
                      <div className="h-1.5 rounded-full bg-[#e8173a]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-[13px] text-white/30">Loading…</p>}
        </Card>
      </div>
    </div>
  );
}
