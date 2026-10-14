// import {
//   createContext, useContext, useEffect, useRef,
//   useState, type ReactNode,
// } from "react";
// import { io, type Socket } from "socket.io-client";
// import { useAuth } from "./AuthContext";

// interface SocketContextValue {
//   socket:    Socket | null;
//   connected: boolean;
// }

// const SocketContext = createContext<SocketContextValue>({
//   socket:    null,
//   connected: false,
// });

// const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "")
//   ?? "http://localhost:3000";

// export function SocketProvider({ children }: { children: ReactNode }) {
//   const { user, token } = useAuth();
//   const socketRef       = useRef<Socket | null>(null);
//   const [connected, setConnected] = useState(false);

//   useEffect(() => {
//     // Only connect when user is logged in
//     if (!user || !token) {
//       socketRef.current?.disconnect();
//       socketRef.current = null;
//       setConnected(false);
//       return;
//     }

//     // Create socket connection
//     const socket = io(SOCKET_URL, {
//       withCredentials: true,
//       transports:      ["websocket", "polling"],
//       auth:            { token },
//     });

//     socket.on("connect",    () => { setConnected(true);  console.log("🔌 Socket connected"); });
//     socket.on("disconnect", () => { setConnected(false); console.log("🔌 Socket disconnected"); });
//     socket.on("connect_error", (err) => console.error("Socket error:", err.message));

//     socketRef.current = socket;

//     return () => {
//       socket.disconnect();
//       socketRef.current = null;
//       setConnected(false);
//     };
//   }, [user, token]);

//   return (
//     <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
//       {children}
//     </SocketContext.Provider>
//   );
// }

// export function useSocket() {
//   return useContext(SocketContext);
// }

import {
  createContext, useContext, useEffect, useRef,
  useState, type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface SocketContextValue {
  socket:    Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket:    null,
  connected: false,
});

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "")
  ?? "http://localhost:3000";

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const socketRef       = useRef<Socket | null>(null);

  // Use state for connected, but expose socket via ref-synced state
  const [connected,    setConnected]    = useState(false);
  const [socketState,  setSocketState]  = useState<Socket | null>(null);

  useEffect(() => {
    if (!user || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketState(null);
      setConnected(false);
      return;
    }

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports:      ["websocket", "polling"],
      auth:            { token },
    });

    socket.on("connect", () => {
      setConnected(true);
      console.log("🔌 Socket connected");
    });
    socket.on("disconnect", () => {
      setConnected(false);
      console.log("🔌 Socket disconnected");
    });
    socket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
    });

    socketRef.current = socket;
    setSocketState(socket);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketState(null);
      setConnected(false);
    };
  }, [user, token]);

  return (
    <SocketContext.Provider value={{ socket: socketState, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}