import { useEffect } from "react";
import { useAuth } from "../../../context/AuthContext.tsx";
import { syncWatchlistAccount } from "../../../hooks/useWatchlist.ts";

/** Switches the shared watchlist between device and account storage as the user signs in/out */
export default function WatchlistSync() {
  const { user } = useAuth();
  const uid = user?.id ?? user?._id ?? null;
  useEffect(() => { void syncWatchlistAccount(!!uid); }, [uid]);
  return null;
}
