const PALETTE = [
  ["#ff7a59", "#ffb199"],
  ["#5b8def", "#67d4f8"],
  ["#f857a6", "#ff5858"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a18cd1", "#fbc2eb"],
  ["#f6d365", "#fda085"],
  ["#30cfd0", "#330867"],
  ["#e0c3fc", "#8ec5fc"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#c79081", "#dfa579"],
];

export function Avatar({ id, size = 22 }: { id: number; size?: number }) {
  const [a, b] = PALETTE[id % PALETTE.length];
  return (
    <span
      className="relative inline-block shrink-0 overflow-hidden rounded-full border border-black/30"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${a}, ${b})`,
      }}
    >
      <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
        <circle cx="20" cy="15" r="6.5" fill="rgba(255,255,255,0.92)" />
        <path d="M7 36c2-8 8-11 13-11s11 3 13 11z" fill="rgba(255,255,255,0.92)" />
      </svg>
    </span>
  );
}
