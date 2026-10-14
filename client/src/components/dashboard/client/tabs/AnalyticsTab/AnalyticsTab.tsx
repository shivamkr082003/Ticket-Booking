import AnalyticsView from "../../../common/AnalyticsView.tsx";
import type { Booking, Show, Movie } from "../../../../../types/movie.types.ts";

interface ClientAnalyticsTabProps {
  myBookings: Booking[];
  myShows:    Show[];
  movies:     Movie[];
}

export default function ClientAnalyticsTab({ myBookings, myShows }: ClientAnalyticsTabProps) {
  return <AnalyticsView eyebrow="My theatres" title="Analytics" bookings={myBookings} shows={myShows} scope="owner" />;
}
