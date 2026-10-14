import AnalyticsView from "../../../common/AnalyticsView.tsx";
import type { Booking, Show, Theatre } from "../../../../../types/movie.types.ts";

interface AnalyticsTabProps {
  bookings: Booking[];
  shows:    Show[];
  theatres: Theatre[];
}

export default function AnalyticsTab({ bookings, shows }: AnalyticsTabProps) {
  return <AnalyticsView eyebrow="Platform" title="Analytics" bookings={bookings} shows={shows} scope="platform" />;
}
