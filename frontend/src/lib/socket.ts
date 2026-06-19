import { io, type Socket } from "socket.io-client";

// Default the backend to the same host the page was loaded from, so the app
// also works when opened via the LAN/Network URL (e.g. on a phone). Falls back
// to localhost during SSR/tests. Override with VITE_SERVER_URL if needed.
const defaultUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : "http://localhost:4000";

const URL = import.meta.env.VITE_SERVER_URL ?? defaultUrl;

export const socket: Socket = io(URL, {
  autoConnect: true,
  transports: ["websocket"],
});
