import { useEffect, useState } from "react";
import SectionHeader from "../../../app/layout/SectionHeader";
import Card from "../../../shared/ui/Card";
import Button from "../../../shared/ui/Button";
import Skeleton from "../../../shared/ui/Skeleton";
import { mockInterestedEvents } from "../../../shared/data/mock/mockInterestedEvents";
import {
	getInterestedEvents,
	setInterestedEvents,
	InterestedEvent as StoredEvent,
} from "../../../shared/lib/storage";
import { useToast } from "../../../shared/ui/Toast";
import InterestedEmpty from "../components/InterestedEmpty";
import InterestedTabs from "../components/InterestedTabs";

export default function InterestedPage() {
	const { notify } = useToast();
	const [loading, setLoading] = useState(true);
	const [events, setEvents] = useState<StoredEvent[]>([]);

	useEffect(() => {
		const stored = getInterestedEvents();
		if (stored.length === 0) {
			setInterestedEvents(mockInterestedEvents);
			setEvents(mockInterestedEvents);
		} else {
			setEvents(stored);
		}
		const timer = setTimeout(() => setLoading(false), 400);
		return () => clearTimeout(timer);
	}, []);

	const handleRemove = (id: string) => {
		const next = events.filter((event) => event.id !== id);
		setEvents(next);
		setInterestedEvents(next);
	};

	return (
		<div className="space-y-5">
			<SectionHeader title="Interested" />
			<InterestedTabs />
			{loading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, index) => (
						<Skeleton key={index} className="h-24" />
					))}
				</div>
			) : events.length === 0 ? (
				<InterestedEmpty />
			) : (
				<div className="space-y-3">
					{events.map((event) => (
						<Card key={event.id} className="space-y-3">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-semibold text-gray-900">{event.title}</p>
									<p className="text-xs text-gray-500">
										{event.date} · {event.time}
									</p>
									<p className="text-xs text-gray-500">{event.location}</p>
								</div>
								<span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
									{event.host}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<p className="text-xs text-gray-400">
									Attending: {event.attendees.join(", ")}
								</p>
							</div>
							<div className="flex gap-2">
								<Button variant="outline" tone="orange" size="sm" className="flex-1" onClick={() => handleRemove(event.id)}>
									Remove
								</Button>
								<Button
									variant="outline"
									tone="blue"
									size="sm"
									className="flex-1"
									onClick={() => notify("Share coming soon")}
								>
									Share
								</Button>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
