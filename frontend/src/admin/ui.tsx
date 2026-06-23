import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

// ── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/8 bg-[#1a1b1e] p-5 ${className}`}>
      {children}
    </div>
  );
}
export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-white/40">{children}</h3>;
}

// ── Button ──────────────────────────────────────────────────────────────────
type Variant = "default" | "danger" | "ghost" | "success" | "warning";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  loading?: boolean;
}
const variantCls: Record<Variant, string> = {
  default: "bg-[#e8173a] hover:bg-[#c9122f] text-white",
  danger:  "bg-[#3a1414] border border-[#e8173a]/40 hover:bg-[#4a1a1a] text-[#f87171]",
  ghost:   "bg-white/5 hover:bg-white/10 text-white/70",
  success: "bg-[#143019] border border-[#2f9e3f]/40 hover:bg-[#1a3d1f] text-[#43c352]",
  warning: "bg-[#2a1f00] border border-[#d97706]/40 hover:bg-[#332600] text-[#fbbf24]",
};
export function Button({ variant = "default", size = "md", loading, children, className = "", disabled, ...props }: BtnProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
        size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-2 text-[13px]"
      } ${variantCls[variant]} ${className}`}
    >
      {loading && (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ── Input ───────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[11px] font-medium text-white/50">{label}</label>}
      <input
        {...props}
        className={`w-full rounded-lg border border-white/10 bg-[#0f1012] px-3 py-2 text-[13px] text-white placeholder-white/25 outline-none transition focus:border-[#e8173a]/60 focus:ring-1 focus:ring-[#e8173a]/20 disabled:opacity-40 ${className}`}
      />
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}

// ── Select ──────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}
export function Select({ label, className = "", children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[11px] font-medium text-white/50">{label}</label>}
      <select
        {...props}
        className={`w-full rounded-lg border border-white/10 bg-[#0f1012] px-3 py-2 text-[13px] text-white outline-none transition focus:border-[#e8173a]/60 ${className}`}
      >
        {children}
      </select>
    </div>
  );
}

// ── Badge ───────────────────────────────────────────────────────────────────
export function Badge({ children, color = "gray" }: { children: ReactNode; color?: "red" | "green" | "yellow" | "blue" | "gray" }) {
  const cls = {
    red:    "bg-red-500/15 text-red-400 border-red-500/20",
    green:  "bg-green-500/15 text-green-400 border-green-500/20",
    yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    blue:   "bg-blue-500/15 text-blue-400 border-blue-500/20",
    gray:   "bg-white/8 text-white/50 border-white/10",
  }[color];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
      {children}
    </span>
  );
}

// ── Stat Card ───────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#1a1b1e] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-1 text-[24px] font-black text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-white/30">{sub}</p>}
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1b1e] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Toast ───────────────────────────────────────────────────────────────────
export function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-xl border px-4 py-3 text-[13px] font-medium shadow-xl ${
      type === "success"
        ? "border-green-500/30 bg-[#0d2010] text-green-400"
        : "border-red-500/30 bg-[#1a0808] text-red-400"
    }`}>
      {type === "success"
        ? <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
        : <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2.5"><path d="M12 9v4m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z" /></svg>
      }
      {msg}
    </div>
  );
}

// ── Divider ─────────────────────────────────────────────────────────────────
export function Divider() {
  return <hr className="my-4 border-white/8" />;
}
