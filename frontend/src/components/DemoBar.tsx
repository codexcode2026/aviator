import { useState } from "react";

export function DemoBar() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="flex items-center justify-between bg-black px-3 py-2 sm:px-5 sm:py-3">
      <span className="text-[15px] font-bold sm:text-[17px]">
        You are playing the Aviator Demo mode
      </span>
      <button
        onClick={() => setOpen(false)}
        aria-label="Close demo notice"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0413c] text-white transition hover:bg-[#d8352f] sm:h-9 sm:w-9"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
