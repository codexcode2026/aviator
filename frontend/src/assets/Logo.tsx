/** Official Aviator wordmark from reference assets (`public/logo.svg`). */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt="Aviator"
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  );
}
