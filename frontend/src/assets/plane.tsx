/** Official in-game plane sprite from reference (`public/plane-reference.png`). */
export function Plane({ className = "" }: { className?: string }) {
  return (
    <img
      src="/plane-reference.png"
      alt=""
      aria-hidden="true"
      className={`h-full w-full object-contain object-left drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)] ${className}`}
      draggable={false}
    />
  );
}
