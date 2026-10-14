import { useEffect, useState } from "react";

// Time-of-day greeting + long date for dashboard headers; refreshes each minute
export function useGreeting() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  const h = now.getHours();
  return {
    greeting: h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening",
    date: now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  };
}
