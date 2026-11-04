import { useState, useEffect } from "react";
import HeroBanner from "../components/HeroBanner";
import TrendingTopics from "../components/TrendingTopics";
import QuickPolls from "../components/QuickPolls";
import WouldYouRather from "../components/WouldYouRather";
import NeighborShoutouts from "../components/NeighborShoutouts";
import LocalWisdom from "../components/LocalWisdom";
import CommunityLeaderboard from "../components/CommunityLeaderboard";
import EnhancedNewsCard, { NewsPost } from "../components/EnhancedNewsCard";
import EventCard from "../components/EventCard";
import SectionHeader from "../../../app/layout/SectionHeader";
import { mockNewsPosts } from "../../../shared/data/mock/mockNewsPosts";
import { eventItems as mockEventItems } from "../../../shared/data/mock/comlinkr.mock";
import { EventPost } from "../../../shared/types/post";

const NEWS_KEY = "comlinkr_news";
const EVENTS_KEY = "comlinkr_events";

export default function FeedPage() {
	const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
	const [events, setEvents] = useState<EventPost[]>([]);

	// Load news & events from localStorage (with fallback to mock data)
	useEffect(() => {
		const storedNews = localStorage.getItem(NEWS_KEY);
		if (storedNews) {
			try { setNewsPosts(JSON.parse(storedNews)); } catch { setNewsPosts(mockNewsPosts); }
		} else {
			setNewsPosts(mockNewsPosts);
			localStorage.setItem(NEWS_KEY, JSON.stringify(mockNewsPosts));
		}

		const storedEvents = localStorage.getItem(EVENTS_KEY);
		if (storedEvents) {
			try { setEvents(JSON.parse(storedEvents)); } catch { setEvents(mockEventItems); }
		} else {
			setEvents(mockEventItems);
			localStorage.setItem(EVENTS_KEY, JSON.stringify(mockEventItems));
		}
	}, []);

	// Listen for real-time same-tab updates
	useEffect(() => {
		function handleNewsUpdate() {
			const s = localStorage.getItem(NEWS_KEY);
			if (s) { try { setNewsPosts(JSON.parse(s)); } catch { /* skip */ } }
		}
		function handleEventsUpdate() {
			const s = localStorage.getItem(EVENTS_KEY);
			if (s) { try { setEvents(JSON.parse(s)); } catch { /* skip */ } }
		}
		window.addEventListener("news-updated", handleNewsUpdate);
		window.addEventListener("events-updated", handleEventsUpdate);
		window.addEventListener("storage", () => { handleNewsUpdate(); handleEventsUpdate(); });
		return () => {
			window.removeEventListener("news-updated", handleNewsUpdate);
			window.removeEventListener("events-updated", handleEventsUpdate);
		};
	}, []);

	// AI-verified posts come first
	const sortedNews = [...newsPosts].sort((a, b) => {
		if (a.aiVerified === true && b.aiVerified !== true) return -1;
		if (a.aiVerified !== true && b.aiVerified === true) return 1;
		return 0;
	});
	const sortedEvents = [...events].sort((a, b) => {
		if (a.aiVerified === true && b.aiVerified !== true) return -1;
		if (a.aiVerified !== true && b.aiVerified === true) return 1;
		return 0;
	});

	return (
		<div className="space-y-5">
			{/* Clean hero — city, greeting, online count */}
			<HeroBanner />

			{/* Would You Rather — fun A/B community game */}
			<WouldYouRather />

			{/* Quick community polls */}
			<QuickPolls />

			{/* Local tips & wisdom from neighbors */}
			<LocalWisdom />

			{/* Neighbor shoutouts & appreciation */}
			<NeighborShoutouts />

			{/* Trending topics in the city */}
			<TrendingTopics />

			{/* Latest Updates */}
			<section className="space-y-4">
				<SectionHeader title="Latest Updates" />
				<div className="grid gap-4">
					{sortedNews.map((post) => (
						<EnhancedNewsCard key={post.id} post={post} />
					))}
				</div>
			</section>

			{/* Upcoming Events */}
			<section className="space-y-4">
				<SectionHeader title="Upcoming Events" />
				<div className="space-y-4">
					{sortedEvents.map((event) => (
						<EventCard key={event.id} event={event} />
					))}
				</div>
			</section>

			{/* Gamified community leaderboard */}
			<CommunityLeaderboard />
		</div>
	);
}
