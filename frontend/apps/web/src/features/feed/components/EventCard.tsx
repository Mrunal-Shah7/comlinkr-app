import { Calendar, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import Button from "../../../shared/ui/Button";
import Card from "../../../shared/ui/Card";
import Avatar from "../../../shared/ui/Avatar";
import SectionTag from "../../../shared/ui/SectionTag";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../shared/ui/Toast";
import { EventPost } from "../../../shared/types/post";

export default function EventCard({ event }: { event: EventPost }) {
	const navigate = useNavigate();
	const { notify } = useToast();

	return (
		<Card interactive className="overflow-hidden p-0">
			{event.image ? (
				<div className="h-32 w-full bg-gray-200">
					<img src={event.image} alt={event.title} className="h-full w-full object-cover" />
				</div>
			) : null}
			<div className="p-4">
				<div className="flex items-center justify-between">
					<SectionTag label="Event" color="var(--brand-orange)" />
					<div className="flex items-center gap-2">
						{event.aiVerified && (
							<span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-semibold">
								<ShieldCheck className="h-3 w-3" /> AI Verified
							</span>
						)}
						{event.aiVerified === false && (
							<span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold animate-pulse">
								🔍 Scanning…
							</span>
						)}
						<span className="text-xs text-gray-400">{event.date}</span>
					</div>
				</div>
				<h3 className="mt-3 text-base font-semibold text-gray-900">{event.title}</h3>
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
						{event.attendees.slice(0, 3).map((person) => (
							<Avatar key={person.id} src={person.avatar} alt={person.name} size="sm" />
						))}
						<div className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-gray-200 text-[10px] text-gray-700">
							+{Math.max(event.attendees.length - 3, 0)}
						</div>
					</div>
					<Button variant="outline" tone="orange" size="sm">
						Interested
					</Button>
				</div>
				<div className="mt-3 flex items-center gap-2">
					<Button variant="primary" tone="orange" size="sm" className="flex-1"
						onClick={() => {
							// Store event chat context in localStorage for ChatPage
							const chatKey = `comlinkr_event_chat_${event.id}`;
							if (!localStorage.getItem(chatKey)) {
								localStorage.setItem(chatKey, JSON.stringify({
									eventId: event.id,
									eventTitle: event.title,
									hostName: event.host.name,
									messages: [
										{ id: "sys_1", text: `Welcome to the "${event.title}" event chat! 🎉 Discuss details and connect with attendees.`, isMe: false, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }
									]
								}));
							}
							notify(`💬 Opening "${event.title}" chat`);
							navigate("/app/chat");
						}}
					>
						Join Event Chat
					</Button>
					<Button variant="outline" tone="blue" size="sm" className="flex-1"
						onClick={() => {
							if (navigator.share) {
								navigator.share({ title: event.title, text: event.description, url: window.location.href });
							} else {
								navigator.clipboard.writeText(`${event.title} — ${event.description}`);
								notify("📋 Event details copied to clipboard!");
							}
						}}
					>
						Share
					</Button>
				</div>
				<div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
					<MessageCircle className="h-4 w-4" />
					Hosted by {event.host.name}
				</div>
			</div>
		</Card>
	);
}
