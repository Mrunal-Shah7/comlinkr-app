import { useState } from "react";
import { X } from "lucide-react";
import Input from "../../../shared/ui/Input";
import Button from "../../../shared/ui/Button";
import { useToast } from "../../../shared/ui/Toast";
import type { NewsPost } from "./EnhancedNewsCard";

const NEWS_KEY = "comlinkr_news";

interface CreateNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateNewsModal({ isOpen, onClose }: CreateNewsModalProps) {
  const { notify } = useToast();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const newPost: NewsPost = {
      id: `news_${Date.now()}`,
      title,
      summary,
      image: image || undefined,
      author: { name: "You", avatar: "https://i.pravatar.cc/150?img=3" },
      timestamp: "Just now",
      location,
      category: "Community",
      likes: 0,
      comments: 0,
      isLiked: false,
      isSaved: false,
      aiVerified: false,
    };

    try {
      const stored = localStorage.getItem(NEWS_KEY);
      const existing: NewsPost[] = stored ? JSON.parse(stored) : [];
      localStorage.setItem(NEWS_KEY, JSON.stringify([newPost, ...existing]));
      window.dispatchEvent(new Event("news-updated"));
    } catch { /* ignore */ }

    notify("✅ News post created successfully!");
    setIsSubmitting(false);
    setTitle("");
    setSummary("");
    setLocation("");
    setImage("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div 
        className="w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl animate-slideUp max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h2 className="text-lg font-bold text-gray-900">Create News Post</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Input
            label="Title"
            placeholder="What's the news?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
            <textarea
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              rows={4}
              placeholder="Share details about this news..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
            />
          </div>

          <Input
            label="Location"
            placeholder="e.g., Midtown, New York"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <Input
            label="Image URL (optional)"
            placeholder="https://..."
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" tone="gray" className="flex-1" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" tone="blue" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
