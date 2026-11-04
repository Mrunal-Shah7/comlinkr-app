import { useState } from "react";
import { X, Newspaper, Calendar, Eye, MapPin, Clock, Image as ImageIcon, Sparkles, ArrowRight, Check } from "lucide-react";
import { useToast } from "../../../shared/ui/Toast";

interface CreateContentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ContentType = "news" | "event" | null;

export default function CreateContentModal({ isOpen, onClose }: CreateContentModalProps) {
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
    
    setTimeout(() => {
      if (contentType === "news") {
        notify("✅ News post created successfully!");
      } else {
        notify("✅ Event created successfully!");
      }
      setIsSubmitting(false);
      resetForm();
      onClose();
    }, 1000);
  }

  function resetForm() {
    setContentType(null);
    setTitle("");
    setSummary("");
    setLocation("");
    setImagePreview("");
    setEventDate("");
    setEventTime("");
    setShowPreview(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div 
        className="relative w-full max-w-[430px] bg-white rounded-t-[28px] shadow-2xl animate-slideUp max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10">
          <div className="flex items-center justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
          <div className="px-5 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {!contentType ? "Create Post" : contentType === "news" ? "Share News" : "Create Event"}
              </h2>
              <p className="text-sm text-gray-500">
                {!contentType ? "Share with your community" : contentType === "news" ? "Keep everyone informed" : "Bring people together"}
              </p>
            </div>
            <button 
              onClick={() => { resetForm(); onClose(); }} 
              className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!contentType ? (
            <div className="px-5 pb-8 space-y-3">
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
                    <span>Include location to help people find you</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Keep titles short and descriptive</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : showPreview ? (
            <div className="px-5 pb-8 space-y-4">
              {/* Preview Card */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {imagePreview && (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-44 object-cover" />
                    <div className="absolute top-3 left-3">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                        contentType === "news" 
                          ? "bg-[#0076EB] text-white" 
                          : "bg-[#26B324] text-white"
                      }`}>
                        {contentType === "news" ? "📰 News" : "🎉 Event"}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="p-4 space-y-3">
                  {!imagePreview && (
                    <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${
                      contentType === "news" 
                        ? "bg-blue-100 text-[#0076EB]" 
                        : "bg-green-100 text-[#26B324]"
                    }`}>
                      {contentType === "news" ? "📰 News" : "🎉 Event"}
                    </span>
                  )}
                  
                  <h3 className="text-lg font-bold text-gray-900">{title || "Your title here"}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{summary || "Your description here"}</p>
                  
                  <div className="flex flex-wrap gap-3 pt-2">
                    {location && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{location}</span>
                      </div>
                    )}
                    
                    {contentType === "event" && eventDate && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}
                    
                    {contentType === "event" && eventTime && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{eventTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowPreview(false)}
                  className="flex-1 py-3.5 px-4 border-2 border-gray-200 rounded-2xl font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  ← Edit
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`flex-1 py-3.5 px-4 rounded-2xl font-semibold text-white transition ${
                    contentType === "news"
                      ? "bg-gradient-to-r from-[#0076EB] to-[#0056b3] hover:shadow-lg hover:shadow-blue-200"
                      : "bg-gradient-to-r from-[#26B324] to-[#1a8a1a] hover:shadow-lg hover:shadow-green-200"
                  } disabled:opacity-50`}
                >
                  {isSubmitting ? "Publishing..." : "Publish →"}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setShowPreview(true); }} className="px-5 pb-8 space-y-5">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cover Image
                </label>
                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={() => setImagePreview("")}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded-lg text-xs text-white">
                      ✓ Image added
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-[#0076EB] hover:bg-blue-50/50 transition cursor-pointer">
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

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={contentType === "news" ? "What's happening?" : "Event name"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 resize-none transition"
                  rows={3}
                  placeholder={contentType === "news" ? "Share the details..." : "What's happening at this event?"}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  required
                />
              </div>

              {/* Event Date & Time */}
              {contentType === "event" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      required
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      required
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
                    />
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g., Midtown, New York"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setContentType(null)}
                  className="flex-1 py-3.5 px-4 border-2 border-gray-200 rounded-2xl font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  ← Back
                </button>
                <button 
                  type="submit"
                  className={`flex-1 py-3.5 px-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 ${
                    contentType === "news"
                      ? "bg-gradient-to-r from-[#0076EB] to-[#0056b3] hover:shadow-lg hover:shadow-blue-200"
                      : "bg-gradient-to-r from-[#26B324] to-[#1a8a1a] hover:shadow-lg hover:shadow-green-200"
                  } transition`}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
