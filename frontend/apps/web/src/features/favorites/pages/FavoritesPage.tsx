import { useEffect, useMemo, useState } from "react";
import SectionHeader from "../../../app/layout/SectionHeader";
import Card from "../../../shared/ui/Card";
import Button from "../../../shared/ui/Button";
import Skeleton from "../../../shared/ui/Skeleton";
import FavoritesEmpty from "../components/FavoritesEmpty";
import FavoritesTabs from "../components/FavoritesTabs";
import { mockSavedItems } from "../../../shared/data/mock/mockSavedItems";
import { getSavedItems, setSavedItems, SavedItem } from "../../../shared/lib/storage";

export default function FavoritesPage() {
	const [loading, setLoading] = useState(true);
	const [items, setItems] = useState<SavedItem[]>([]);
	const [activeTab, setActiveTab] = useState("All");

	useEffect(() => {
		const stored = getSavedItems();
		if (stored.length === 0) {
			setSavedItems(mockSavedItems);
			setItems(mockSavedItems);
		} else {
			setItems(stored);
		}
		const timer = setTimeout(() => setLoading(false), 400);
		return () => clearTimeout(timer);
	}, []);

	const filtered = useMemo(() => {
		if (activeTab === "All") return items;
		return items.filter((item) => item.type === activeTab.toLowerCase());
	}, [items, activeTab]);

	const handleRemove = (id: string) => {
		const next = items.filter((item) => item.id !== id);
		setItems(next);
		setSavedItems(next);
	};

	return (
		<div className="space-y-5">
			<SectionHeader title="Saved" />
			<FavoritesTabs onChange={setActiveTab} active={activeTab} />
			{loading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, index) => (
						<Skeleton key={index} className="h-24" />
					))}
				</div>
			) : filtered.length === 0 ? (
				<FavoritesEmpty />
			) : (
				<div className="space-y-3">
					{filtered.map((item) => (
						<Card key={item.id} className="space-y-3">
							<div className="flex gap-3">
								<div className="h-16 w-16 overflow-hidden rounded-2xl bg-gray-200">
									{item.image ? (
										<img src={item.image} alt={item.title} className="h-full w-full object-cover" />
									) : null}
								</div>
								<div className="flex-1">
									<p className="text-sm font-semibold text-gray-900">{item.title}</p>
									<p className="text-xs text-gray-500">{item.subtitle}</p>
									{item.meta ? <p className="text-xs text-gray-400">{item.meta}</p> : null}
								</div>
								<span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
									{item.type}
								</span>
							</div>
							<Button variant="outline" tone="gray" size="sm" onClick={() => handleRemove(item.id)}>
								Remove from saved
							</Button>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
