import { MessageCircle } from "lucide-react";
import ShareButton from "../../../shared/ui/ShareButton";

interface ListingCardProps {
  id: string;
  title: string;
  meta: string;
  image: string;
  onChat: () => void;
}

export default function ListingCard({ id, title, meta, image, onChat }: ListingCardProps) {
  return (
    <div className="flex rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition">
      <img
        src={image}
        alt={title}
        className="h-24 w-24 object-cover flex-shrink-0"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=200&q=80";
        }}
      />
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
          <p className="text-xs text-gray-500 mb-2">{meta}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onChat}
            className="inline-flex items-center gap-1 rounded-full bg-brand-blue text-white px-3 py-1 text-xs font-medium shadow hover:bg-blue-700 transition"
            aria-label="Chat"
          >
            <MessageCircle className="h-4 w-4" /> Chat
          </button>
          <ShareButton 
            url={`${window.location.origin}/listing/${id}`}
            title={title}
            variant="button"
          />
        </div>
      </div>
    </div>
  );
}
