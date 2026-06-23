import { Logo } from "../assets/Logo";
import { useGame } from "../store/gameStore";
import { fmt } from "../lib/format";
import { useAuth } from "../lib/authContext";

export function Header() {
  const balance  = useGame((s) => s.balance);
  const currency = useGame((s) => s.currency);
  const { profile, logout } = useAuth();

  const displayBalance = balance;
  const displayCurrency = profile ? profile.currency : currency;

  return (
    <header
      data-testid="header"
      className="flex shrink-0 items-center justify-between border-b border-brand/50 bg-[#1b1d1f] px-3 py-1.5 sm:px-5"
    >
      <Logo className="h-[26px] sm:h-[30px]" />

      <div className="flex items-center gap-3">
        {/* Balance */}
        <div className="flex items-baseline gap-1">
          <span data-testid="header-balance" className="text-[14px] font-bold sm:text-[16px]">
            {fmt(displayBalance)}
          </span>
          <span className="text-[11px] font-medium text-white/55 sm:text-[12px]">
            {displayCurrency}
          </span>
        </div>

        {/* User info */}
        {profile && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right leading-tight">
              <div className="text-[12px] font-semibold text-white/80">
                {profile.display_name ?? profile.username ?? profile.email}
              </div>
              {profile.role !== "user" && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#e8173a]">
                  {profile.role}
                </div>
              )}
            </div>
            {/* Avatar circle */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#e8173a] to-[#ff6b35] text-[11px] font-black text-white">
              {(profile.display_name ?? profile.username ?? profile.email)
                .charAt(0).toUpperCase()}
            </div>
            {/* Logout */}
            <button
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              data-testid="logout-btn"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/8 hover:text-white/70"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
