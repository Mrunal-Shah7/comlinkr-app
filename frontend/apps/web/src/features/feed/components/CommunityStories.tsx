import { useState, useRef, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, X, Eye } from "lucide-react";
import { useAuth } from "../../../app/providers/AuthProvider";

interface Story {
	id: string;
	userName: string;
	userAvatar: string;
	image: string;
	caption: string;
	timeAgo: string;
	viewed: boolean;
	views: number;
	isOwn?: boolean;
}

const STORIES_KEY = "comlinkr_stories";

const DEFAULT_STORIES: Story[] = [
	{
		id: "s1", userName: "Sarah J.", userAvatar: "https://i.pravatar.cc/150?img=5",
		image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&q=80",
		caption: "Community garden looking beautiful today! 🌻", timeAgo: "2h", viewed: false, views: 47,
	},
	{
		id: "s2", userName: "Alex C.", userAvatar: "https://i.pravatar.cc/150?img=8",
		image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80",
		caption: "Found this amazing new coffee spot ☕", timeAgo: "4h", viewed: false, views: 89,
	},
	{
		id: "s3", userName: "Mira P.", userAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
		image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80",
		caption: "Sunset from the rooftop mixer 🌅", timeAgo: "5h", viewed: false, views: 132,
	},
	{
		id: "s4", userName: "Daniel W.", userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
		image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80",
		caption: "Basketball game at Riverside 🏀", timeAgo: "6h", viewed: false, views: 64,
	},
	{
		id: "s5", userName: "Emily R.", userAvatar: "https://i.pravatar.cc/150?img=9",
		image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&q=80",
		caption: "Farmers market finds 🍓🥑", timeAgo: "8h", viewed: false, views: 203,
	},
	{
		id: "s6", userName: "Jules M.", userAvatar: "https://i.pravatar.cc/150?img=11",
		image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80",
		caption: "New restaurant downtown is amazing!", timeAgo: "10h", viewed: false, views: 56,
	},
];

export default function CommunityStories() {
	const { user } = useAuth();
	const scrollRef = useRef<HTMLDivElement>(null);
	const [stories, setStories] = useState<Story[]>([]);
	const [activeStory, setActiveStory] = useState<Story | null>(null);
	const [progress, setProgress] = useState(0);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(true);

	useEffect(() => {
		const stored = localStorage.getItem(STORIES_KEY);
		if (stored) {
			try { setStories(JSON.parse(stored)); return; } catch { /* fallback */ }
		}
		setStories(DEFAULT_STORIES);
		localStorage.setItem(STORIES_KEY, JSON.stringify(DEFAULT_STORIES));
	}, []);

	useEffect(() => {
		if (!activeStory) { setProgress(0); return; }
		const dur = 5000;
		const start = Date.now();
		const timer = setInterval(() => {
			const elapsed = Date.now() - start;
			const pct = Math.min((elapsed / dur) * 100, 100);
			setProgress(pct);
			if (pct >= 100) {
				clearInterval(timer);
				goNextStory();
			}
		}, 50);
		return () => clearInterval(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeStory?.id]);

	function openStory(story: Story) {
		setActiveStory(story);
		// Mark as viewed
		const updated = stories.map(s => s.id === story.id ? { ...s, viewed: true, views: s.views + 1 } : s);
		setStories(updated);
		localStorage.setItem(STORIES_KEY, JSON.stringify(updated));
	}

	function goNextStory() {
		if (!activeStory) return;
		const idx = stories.findIndex(s => s.id === activeStory.id);
		if (idx < stories.length - 1) {
			openStory(stories[idx + 1]);
		} else {
			setActiveStory(null);
		}
	}

	function goPrevStory() {
		if (!activeStory) return;
		const idx = stories.findIndex(s => s.id === activeStory.id);
		if (idx > 0) {
			openStory(stories[idx - 1]);
		}
	}

	function handleScroll() {
		const el = scrollRef.current;
		if (!el) return;
		setCanScrollLeft(el.scrollLeft > 10);
		setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
	}

	function scroll(dir: "left" | "right") {
		scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
	}

	function handleCreateStory() {
		const captions = [
			"Having a great day in the city! 🌆",
			"Love this neighborhood vibes ✨",
			"Community event was awesome! 🎉",
			"Beautiful morning walk 🌅",
		];
		const images = [
			"https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80",
			"https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&q=80",
			"https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&q=80",
		];
		const newStory: Story = {
			id: `s_${Date.now()}`,
			userName: "You",
			userAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "User")}&background=0076EB&color=fff`,
			image: images[Math.floor(Math.random() * images.length)],
			caption: captions[Math.floor(Math.random() * captions.length)],
			timeAgo: "Now",
			viewed: false,
			views: 0,
			isOwn: true,
		};
		const updated = [newStory, ...stories];
		setStories(updated);
		localStorage.setItem(STORIES_KEY, JSON.stringify(updated));
	}

	return (
		<>
			{/* Stories bar */}
			<div className="relative">
				{canScrollLeft && (
					<button onClick={() => scroll("left")}
						className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition">
						<ChevronLeft className="h-4 w-4 text-gray-600" />
					</button>
				)}
				{canScrollRight && (
					<button onClick={() => scroll("right")}
						className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition">
						<ChevronRight className="h-4 w-4 text-gray-600" />
					</button>
				)}

				<div ref={scrollRef} onScroll={handleScroll}
					className="flex gap-3 overflow-x-auto scrollbar-hide py-1 px-1">

					{/* Add Story */}
					<button onClick={handleCreateStory}
						className="flex-shrink-0 flex flex-col items-center gap-1.5 group">
						<div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-blue-50 group-hover:to-blue-100 transition-all">
							<div className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-[#0076EB] flex items-center justify-center ring-2 ring-white">
								<Plus className="h-3.5 w-3.5 text-white" />
							</div>
							<img
								src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "You")}&background=e8e8e8&color=666&size=64`}
								alt="You"
								className="h-full w-full rounded-full object-cover opacity-60"
							/>
						</div>
						<span className="text-[10px] font-medium text-gray-500 w-16 text-center truncate">Your Story</span>
					</button>

					{/* Story items */}
					{stories.map((story) => (
						<button key={story.id} onClick={() => openStory(story)}
							className="flex-shrink-0 flex flex-col items-center gap-1.5 group">
							<div className={`relative h-16 w-16 rounded-full p-[2.5px] ${story.viewed
								? "bg-gray-300"
								: "bg-gradient-to-br from-[#0076EB] via-[#26B324] to-[#FF7B00]"
								}`}>
								<img src={story.userAvatar} alt={story.userName}
									className="h-full w-full rounded-full object-cover ring-2 ring-white" />
							</div>
							<span className={`text-[10px] w-16 text-center truncate ${story.viewed ? "text-gray-400" : "text-gray-700 font-semibold"
								}`}>{story.userName}</span>
						</button>
					))}
				</div>
			</div>

			{/* Fullscreen Story Viewer */}
			{activeStory && (
				<div className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
					onClick={(e) => {
						const rect = (e.target as HTMLElement).getBoundingClientRect();
						const x = e.clientX - rect.left;
						if (x < rect.width / 3) goPrevStory();
						else if (x > (rect.width * 2) / 3) goNextStory();
					}}>
					{/* Progress bar */}
					<div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3">
						{stories.map((s, i) => {
							const activeIdx = stories.findIndex(st => st.id === activeStory.id);
							return (
								<div key={s.id} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
									<div className="h-full bg-white rounded-full transition-all duration-100"
										style={{
											width: i < activeIdx ? "100%" : i === activeIdx ? `${progress}%` : "0%"
										}} />
								</div>
							);
						})}
					</div>

					{/* Header */}
					<div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-between px-4">
						<div className="flex items-center gap-3">
							<img src={activeStory.userAvatar} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/50" />
							<div>
								<p className="text-white font-semibold text-sm">{activeStory.userName}</p>
								<p className="text-white/60 text-xs">{activeStory.timeAgo} ago</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<span className="flex items-center gap-1 text-white/70 text-xs">
								<Eye className="h-3.5 w-3.5" /> {activeStory.views}
							</span>
							<button onClick={(e) => { e.stopPropagation(); setActiveStory(null); }}
								className="text-white/80 hover:text-white">
								<X className="h-6 w-6" />
							</button>
						</div>
					</div>

					{/* Story Image */}
					<img src={activeStory.image} alt="" className="max-h-[80vh] max-w-full object-contain rounded-xl" />

					{/* Caption */}
					<div className="absolute bottom-8 left-0 right-0 text-center px-8">
						<p className="text-white text-base font-medium drop-shadow-lg bg-black/30 backdrop-blur-sm inline-block px-5 py-2.5 rounded-2xl">
							{activeStory.caption}
						</p>
					</div>
				</div>
			)}
		</>
	);
}
