import type { GameEngine } from "./gameEngine.js";

declare global {
  // eslint-disable-next-line no-var
  var __gameEngine: GameEngine | undefined;
}
