import SectionHeader from "../../../app/layout/SectionHeader";
import { eventItems } from "../../../shared/data/mock/comlinkr.mock";
import EventCard from "../components/EventCard";

export default function EventsPage() {
  return (
    <div className="space-y-5">
      <SectionHeader title="Upcoming Events" />
      <div className="space-y-4">
        {eventItems.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
