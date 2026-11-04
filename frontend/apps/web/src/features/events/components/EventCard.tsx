import { Calendar, MapPin, Share2, User } from "lucide-react";
import Avatar from "../../../shared/ui/Avatar";
import Button from "../../../shared/ui/Button";
import Card from "../../../shared/ui/Card";
import SectionTag from "../../../shared/ui/SectionTag";
import { EventPost } from "../../../shared/types/post";

export default function EventCard({ event }: { event: EventPost }) {
  return (
    <Card interactive className="overflow-hidden p-0">
      {event.image ? (
        <div className="h-40 w-full bg-gray-200">
          <img src={event.image} alt={event.title} className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <SectionTag label="Event" color="var(--brand-orange)" />
          <span className="text-xs text-gray-400">{event.date}</span>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-gray-900">{event.title}</h3>
        <p className="mt-1 text-sm text-gray-600">{event.description}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="h-4 w-4" />
          {event.time}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="h-4 w-4" />
          {event.location.area}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex -space-x-2">
            {event.attendees.slice(0, 4).map((person) => (
              <Avatar key={person.id} src={person.avatar} alt={person.name} size="sm" />
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <User className="h-4 w-4" />
            Hosted by {event.host.name}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="primary" tone="orange" size="sm" className="flex-1">
            Interested
          </Button>
          <Button variant="outline" tone="blue" size="sm" className="flex-1">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
        <Button variant="outline" tone="orange" size="sm" className="mt-3 w-full">
          Join Event Chat
        </Button>
      </div>
    </Card>
  );
}
