import { io } from "socket.io-client";

import { SOCKET_URL } from "@/shared/config/runtimeConfig";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket"],
});
