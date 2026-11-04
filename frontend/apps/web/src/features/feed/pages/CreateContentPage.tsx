import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Newspaper, Calendar, Eye, MapPin, Clock, Image as ImageIcon, Sparkles, ArrowRight, Check, X } from "lucide-react";
import { useToast } from "../../../shared/ui/Toast";
import PageContainer from "../../../app/layout/PageContainer";
import { NewsPost } from "../components/EnhancedNewsCard";
import { EventPost } from "../../../shared/types/post";

type ContentType = "news" | "event" | null;

const NEWS_STORAGE_KEY = "comlinkr_news";
const EVENTS_STORAGE_KEY = "comlinkr_events";

export default function CreateContentPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [contentType, setContentType] = useState<ContentType>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [location, setLocation] = useState("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Event specific fields
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        notify("⚠️ Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        notify("⚠️ Image size should be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (contentType === "news") {
      // Build a NewsPost matching EnhancedNewsCard's interface
      const newPost: NewsPost = {
        id: `news_${Date.now()}`,
        title,
        summary,
        image: imagePreview || undefined,
        author: {
          name: "You",
          avatar: "https://i.pravatar.cc/150?img=3",
        },
        timestamp: "Just now",
        location: location,
        category: "Community",
        likes: 0,
        comments: 0,
        isLiked: false,
        isSaved: false,
        aiVerified: false,
      };

      try {
        const stored = localStorage.getItem(NEWS_STORAGE_KEY);
        const existing: NewsPost[] = stored ? JSON.parse(stored) : [];
        const updated = [newPost, ...existing];
        localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event("news-updated"));
      } catch { /* ignore */ }

      // Simulate AI verification scan after 3 seconds
      const postId = newPost.id;
      setTimeout(() => {
        try {
          const stored = localStorage.getItem(NEWS_STORAGE_KEY);
          if (stored) {
            const posts: NewsPost[] = JSON.parse(stored);
            const idx = posts.findIndex(p => p.id === postId);
            if (idx !== -1) {
              posts[idx].aiVerified = true;
              localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(posts));
              window.dispatchEvent(new Event("news-updated"));
            }
          }
        } catch { /* ignore */ }
      }, 3000);

      notify("✅ News post created! AI verification in progress…");
    } else {
      // Build an EventPost matching the shared type
      const newEvent: EventPost = {
        id: `evt_${Date.now()}`,
        title,
        description: summary,
        image: imagePreview || undefined,
        date: eventDate ? new Date(eventDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "",
        time: eventTime || "",
        location: { city: "New York", area: location },
        host: { id: "me", name: "You", handle: "you", city: "New York", avatar: "https://i.pravatar.cc/150?img=3" },
        attendees: [],
        category: "events",
        aiVerified: false,
      };

      try {
        const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
        const existing: EventPost[] = stored ? JSON.parse(stored) : [];
        const updated = [newEvent, ...existing];
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event("events-updated"));
      } catch { /* ignore */ }

      // Simulate AI verification scan after 3 seconds
      const eventId = newEvent.id;
      setTimeout(() => {
        try {
          const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
          if (stored) {
            const evts: EventPost[] = JSON.parse(stored);
            const idx = evts.findIndex(e => e.id === eventId);
            if (idx !== -1) {
              evts[idx].aiVerified = true;
              localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(evts));
              window.dispatchEvent(new Event("events-updated"));
            }
          }
        } catch { /* ignore */ }
      }, 3000);

      notify("✅ Event created! AI verification in progress…");
    }

    setTimeout(() => {
      setIsSubmitting(false);
      navigate("/app/feed");
    }, 500);
  }

  const isFormValid = contentType === "event" 
    ? title && summary && location && eventDate && eventTime
    : title && summary && location;

  return (
    <PageContainer>
      {/* Header */}
      {contentType && (
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <button 
            onClick={() => setContentType(null)}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {contentType === "news" ? "Share News" : "Create Event"}
            </h1>
            <p className="text-xs text-gray-500">
              {contentType === "news" ? "Keep everyone informed" : "Bring people together"}
            </p>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="py-5">
        {!contentType ? (
          <div className="space-y-3">
            {/* News Option */}
            <button
              onClick={() => setContentType("news")}
              className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-white border-2 border-blue-100 rounded-2xl hover:border-[#0076EB] hover:shadow-lg transition-all group"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0076EB] to-[#0056b3] shadow-lg shadow-blue-200 group-hover:scale-105 transition">
                <Newspaper className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-gray-900 text-lg">News Post</h3>
                <p className="text-sm text-gray-500">Share updates & announcements</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#0076EB] group-hover:translate-x-1 transition-all" />
            </button>

            {/* Event Option */}
            <button
              onClick={() => setContentType("event")}
              className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-white border-2 border-green-100 rounded-2xl hover:border-[#26B324] hover:shadow-lg transition-all group"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#26B324] to-[#1a8a1a] shadow-lg shadow-green-200 group-hover:scale-105 transition">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-gray-900 text-lg">Event</h3>
                <p className="text-sm text-gray-500">Create & host an event</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#26B324] group-hover:translate-x-1 transition-all" />
            </button>

            {/* Tips */}
            <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-gray-900">Quick Tips</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Add an eye-catching image to get more views</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Include location to reach the right audience</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Write a clear, engaging summary</span>
                </li>
              </ul>
            </div>
          </div>
        ) : showPreview ? (
          /* Preview Mode */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    contentType === "news" 
                      ? "bg-blue-100 text-[#0076EB]" 
                      : "bg-green-100 text-[#26B324]"
                  }`}>
                    {contentType === "news" ? "News" : "Event"}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{title || "Your Title"}</h3>
                <p className="text-gray-600 text-sm mb-3">{summary || "Your summary will appear here..."}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {location || "Location"}
                  </span>
                  {contentType === "event" && eventDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {eventDate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setShowPreview(false)}
                className="flex-1 py-3.5 px-4 border-2 border-gray-200 rounded-2xl font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Edit
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-[#0076EB] to-[#26B324] rounded-2xl font-semibold text-white hover:shadow-lg hover:shadow-blue-200 transition disabled:opacity-50"
              >
                {isSubmitting ? "Posting..." : "Post Now"}
              </button>
            </div>
          </div>
        ) : (
          /* Form Mode */
          <form onSubmit={(e) => { e.preventDefault(); setShowPreview(true); }} className="space-y-5">
            {/* Type Badge */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                contentType === "news" 
                  ? "bg-gradient-to-br from-[#0076EB] to-[#0056b3]" 
                  : "bg-gradient-to-br from-[#26B324] to-[#1a8a1a]"
              }`}>
                {contentType === "news" ? (
                  <Newspaper className="w-4 h-4 text-white" />
                ) : (
                  <Calendar className="w-4 h-4 text-white" />
                )}
              </div>
              <span className="text-sm font-medium text-gray-600">
                {contentType === "news" ? "Creating News Post" : "Creating Event"}
              </span>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={contentType === "news" ? "What's the headline?" : "Event name"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Summary <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder={contentType === "news" ? "Share the details..." : "Describe your event..."}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 resize-none transition"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Where is this happening?"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
                />
              </div>
            </div>

            {/* Event Date & Time */}
            {contentType === "event" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cover Image
              </label>
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                  <button
                    type="button"
                    onClick={() => setImagePreview("")}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-[#0076EB] hover:bg-blue-50/50 transition cursor-pointer">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700">Tap to upload image</span>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP • Max 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-3 pb-4">
              <button 
                type="submit"
                disabled={!isFormValid}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#0076EB] to-[#26B324] rounded-2xl font-semibold text-white flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-200 transition disabled:opacity-50"
              >
                <Eye className="w-5 h-5" />
                Preview
              </button>
            </div>
          </form>
        )}
      </div>
    </PageContainer>
  );
}
