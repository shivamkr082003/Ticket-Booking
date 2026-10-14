import { useEffect, useState, useCallback } from "react";
import { useSocket } from "../context/SocketContext.tsx";

interface SeatState {
  bookedSeats:   string[];  // permanently booked (from DB)
  tempBlocked:   string[];  // temporarily blocked by other users
}

interface UseShowSocketReturn extends SeatState {
  selectSeats:   (seats: string[]) => void;
  deselectSeats: (seats: string[]) => void;
  isSeatTaken:   (seat: string) => boolean;
}

export function useShowSocket(
  showId:       string | undefined,
  userId:       string | undefined,
  initialBooked: string[] = []
): UseShowSocketReturn {
  const { socket } = useSocket();

  const [bookedSeats, setBookedSeats] = useState<string[]>(initialBooked);
  const [tempBlocked, setTempBlocked] = useState<string[]>([]);

  useEffect(() => {
    setBookedSeats(initialBooked);
  }, [initialBooked.join(",")]);

  useEffect(() => {
    if (!socket || !showId) return;

    // Join show room
    socket.emit("join:show", showId);

    // Receive current state of show room
    socket.on("seats:state", ({ tempBlocked: tb }: { showId: string; tempBlocked: string[] }) => {
      setTempBlocked(tb);
    });

    // Someone else blocked seats
    socket.on("seats:blocked", ({ seats, userId: byUser }: { showId: string; seats: string[]; userId: string }) => {
      if (byUser === userId) return; // ignore own events
      setTempBlocked(prev => [...new Set([...prev, ...seats])]);
    });

    // Someone released seats (deselected or timed out)
    socket.on("seats:released", ({ seats, userId: byUser }: { showId: string; seats: string[]; userId: string }) => {
      if (byUser === userId) return;
      setTempBlocked(prev => prev.filter(s => !seats.includes(s)));
    });

    // Booking confirmed — permanently booked
    socket.on("seats:booked", ({ seats }: { showId: string; seats: string[] }) => {
      setBookedSeats(prev => [...new Set([...prev, ...seats])]);
      setTempBlocked(prev => prev.filter(s => !seats.includes(s)));
    });

    return () => {
      socket.emit("leave:show", showId);
      socket.off("seats:state");
      socket.off("seats:blocked");
      socket.off("seats:released");
      socket.off("seats:booked");
    };
  }, [socket, showId, userId]);

  // Tell others I'm selecting these seats
  const selectSeats = useCallback((seats: string[]) => {
    if (!socket || !showId || !userId) return;
    socket.emit("seats:selecting", { showId, seats, userId });
  }, [socket, showId, userId]);

  // Tell others I deselected these seats
  const deselectSeats = useCallback((seats: string[]) => {
    if (!socket || !showId || !userId) return;
    socket.emit("seats:deselecting", { showId, seats, userId });
  }, [socket, showId, userId]);

  // Is a seat unavailable (booked or temp blocked by others)?
  const isSeatTaken = useCallback((seat: string) => {
    return bookedSeats.includes(seat) || tempBlocked.includes(seat);
  }, [bookedSeats, tempBlocked]);

  return { bookedSeats, tempBlocked, selectSeats, deselectSeats, isSeatTaken };
}