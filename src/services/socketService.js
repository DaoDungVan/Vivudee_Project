import { io } from "socket.io-client";
import API from "./axiosInstance";

const SOCKET_BASE_URL = String(API.defaults.baseURL || "").replace(/\/api\/?$/, "");

export const createSocketConnection = (token) =>
  io(SOCKET_BASE_URL, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    auth: {
      token,
    },
  });
