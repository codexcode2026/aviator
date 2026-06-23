import { io, type Socket } from "socket.io-client";

const defaultUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:4000";

const URL = import.meta.env.VITE_SERVER_URL ?? defaultUrl;

/** Stable per-browser token so demo balance survives page refreshes. */
function getClientToken(): string {
  const key = "aviator_client_token";
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

export const socket: Socket = io(URL, {
  autoConnect: true,
  transports: ["websocket"],
});

// Send stable token immediately on every (re)connect so server can restore balance.
socket.on("connect", () => {
  socket.emit("client:token", getClientToken());
});
