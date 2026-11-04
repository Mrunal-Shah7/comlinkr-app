import { MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";

type ListingCardProps = {
	id: string;
	title: string;
	meta: string;
	image: string;
	onChat?: () => void;
	onShare?: () => void;
};

export default function ListingCard({ title, meta, image, onChat, onShare }: ListingCardProps) {
	const [shared, setShared] = useState(false);
	return (
		<div className="flex rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
			<img src={image} alt={title} className="h-24 w-24 object-cover" />
			<div className="flex-1 flex flex-col justify-between p-3">
				<div>
					<h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
					<p className="text-xs text-gray-500 mb-2">{meta}</p>
				</div>
				<div className="flex gap-2">
					<button
						className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand-blue text-white text-xs font-medium shadow hover:bg-blue-700 transition"
						onClick={onChat}
						aria-label="Chat"
					>
						<MessageCircle className="h-4 w-4" /> Chat
					</button>
					<button
						className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium shadow hover:bg-gray-200 transition ${shared ? 'bg-brand-green text-white' : ''}`}
						onClick={() => { setShared(true); onShare && onShare(); }}
						aria-label="Share"
					>
						<Share2 className="h-4 w-4" /> {shared ? 'Shared!' : 'Share'}
					</button>
				</div>
			</div>
		</div>
	);
}
