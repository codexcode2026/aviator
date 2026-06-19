import { useState } from "react";
import { BetPanel } from "./BetPanel";

export function BetPanels() {
  const [dual, setDual] = useState(true);

  if (!dual) {
    return (
    <div data-testid="bet-panels" className="p-1">
      <div className="mx-auto max-w-[560px]">
          <BetPanel index={0} canAdd onAdd={() => setDual(true)} />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="bet-panels" className="grid grid-cols-1 gap-1 p-1 lg:grid-cols-2">
      <BetPanel index={0} />
      <BetPanel index={1} canRemove onRemove={() => setDual(false)} />
    </div>
  );
}
