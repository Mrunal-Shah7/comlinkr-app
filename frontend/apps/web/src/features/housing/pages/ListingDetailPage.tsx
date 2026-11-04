import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin, BedDouble, Bath, Maximize, CheckCircle2, MessageCircle, Send, Phone, Calendar, Home, Smile, Paperclip, MoreVertical } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { mockListings } from "../../../shared/data/mock/mockListings";
import { Listing } from "../housing.types";
import ImageCarousel from "../../../shared/ui/ImageCarousel";
import ShareButton from "../../../shared/ui/ShareButton";
import Button from "../../../shared/ui/Button";
import { useToast } from "../../../shared/ui/Toast";

const LISTINGS_STORAGE_KEY = "comlinkr_listings";

type ChatMessage = {
  id: string;
  text: string;
  isMe: boolean;
  timestamp: string;
};

const CHAT_STORAGE_KEY = 'comlinkr_listing_chats';

const QUICK_REPLIES = [
  { icon: Calendar, text: "Can I schedule a viewing?" },
  { icon: Home, text: "Is this still available?" },
  { icon: Phone, text: "Can we talk on the phone?" },
];

export default function ListingDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  // Load listing from localStorage first, then fall back to mock data
  const listing = (() => {
    try {
      const stored = localStorage.getItem(LISTINGS_STORAGE_KEY);
      if (stored) {
        const all: Listing[] = JSON.parse(stored);
        const found = all.find((l) => l.id === id);
        if (found) return found;
      }
    } catch { /* ignore */ }
    return mockListings.find((l) => l.id === id);
  })();
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-open chat if coming from listing card with chat=true
  useEffect(() => {
    if (searchParams.get('chat') === 'true') {
      setShowChat(true);
    }
  }, [searchParams]);

  // Load chat history from localStorage
  useEffect(() => {
    if (id) {
      const stored = localStorage.getItem(`${CHAT_STORAGE_KEY}_${id}`);
      if (stored) {
        try {
          setMessages(JSON.parse(stored));
        } catch {
          setMessages([]);
        }
      }
    }
  }, [id]);

  // Save messages to localStorage
  useEffect(() => {
    if (id && messages.length > 0) {
      localStorage.setItem(`${CHAT_STORAGE_KEY}_${id}`, JSON.stringify(messages));
    }
  }, [messages, id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (showChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: `m${Date.now()}`,
      text: newMessage.trim(),
      isMe: true,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsTyping(true);

    // Simulate landlord response after 1-2 seconds
    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        `Hi! Thanks for your interest in ${listing?.title}. How can I help you?`,
        "The apartment is still available! Would you like to schedule a viewing?",
        "Yes, the rent includes utilities. Let me know if you have more questions!",
        "Great question! I can show you the place this weekend if you're free.",
        "The neighborhood is very safe and family-friendly. Lots of great restaurants nearby!",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const landlordMessage: ChatMessage = {
        id: `m${Date.now()}`,
        text: randomResponse,
        isMe: false,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, landlordMessage]);
    }, 1500 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickReply = (text: string) => {
    setNewMessage(text);
    // Auto-send after a brief delay
    setTimeout(() => {
      const userMessage: ChatMessage = {
        id: `m${Date.now()}`,
        text: text,
        isMe: true,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, userMessage]);
      setNewMessage("");
      setIsTyping(true);

      setTimeout(() => {
        setIsTyping(false);
        let response = "";
        if (text.includes("viewing") || text.includes("schedule")) {
          response = `Sure! I'm available this Saturday or Sunday afternoon. Which works better for you?`;
        } else if (text.includes("available")) {
          response = `Yes, ${listing?.title} is still available! Would you like to schedule a viewing?`;
        } else if (text.includes("phone") || text.includes("call")) {
          response = `Of course! You can reach me at ${listing?.landlord.phone}. I'm usually available between 9 AM - 7 PM.`;
        } else {
          response = "Thanks for your message! I'll get back to you shortly.";
        }
        
        const landlordMessage: ChatMessage = {
          id: `m${Date.now()}`,
          text: response,
          isMe: false,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, landlordMessage]);
      }, 1500 + Math.random() * 1000);
    }, 100);
  };

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Listing not found</h2>
        <Button onClick={() => navigate("/app/housing")}>Back to Listings</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">

      {/* Show Chat View OR Listing Details based on showChat state */}
      {showChat ? (
        /* ==================== INLINE CHAT VIEW ==================== */
        <div className="space-y-0 -mx-4">
          {/* Chat Header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-[#0062CC] via-[#0072DD] to-[#004FAA] px-4 py-3">
            <button 
              onClick={() => setShowChat(false)}
              className="p-1.5 hover:bg-white/20 rounded-full transition"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                {listing.landlord.name.charAt(0)}
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 border-2 border-[#0076EB] rounded-full" />
            </div>
            <div className="flex-1 text-white min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold truncate">{listing.landlord.name}</h3>
                {listing.landlord.verified && (
                  <CheckCircle2 className="h-4 w-4 text-white/80 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-white/80">
                {isTyping ? 'typing...' : 'Online now'}
              </p>
            </div>
            <button 
              onClick={() => notify("More options coming soon!")}
              className="p-2 hover:bg-white/20 rounded-full transition"
            >
              <MoreVertical className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Listing Quick Preview */}
          <div 
            onClick={() => setShowChat(false)}
            className="bg-white border-b px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition"
          >
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-12 h-12 rounded-xl object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{listing.title}</p>
              <p className="text-xs text-[#0076EB] font-semibold">${listing.price}/month</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="h-[calc(100vh-320px)] overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#0076EB]/10 to-[#26B324]/10 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-8 w-8 text-[#0076EB]" />
                </div>
                <p className="text-sm font-medium text-gray-700">Start a conversation</p>
                <p className="text-xs text-gray-500 mt-1 mb-4">
                  Ask {listing.landlord.name.split(' ')[0]} about the listing
                </p>
                
                {/* Quick Reply Suggestions */}
                <div className="space-y-2">
                  {QUICK_REPLIES.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickReply(reply.text)}
                      className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 text-left hover:border-[#0076EB] hover:bg-blue-50/50 transition group"
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0076EB]/10 to-[#26B324]/10 flex items-center justify-center flex-shrink-0">
                        <reply.icon className="h-4 w-4 text-[#0076EB]" />
                      </div>
                      <span className="text-sm text-gray-700">{reply.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-end gap-2 max-w-[85%]">
                  {!msg.isMe && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0076EB] to-[#26B324] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {listing.landlord.name.charAt(0)}
                    </div>
                  )}
                  <div 
                    className={`rounded-2xl px-4 py-2.5 ${
                      msg.isMe 
                        ? 'bg-gradient-to-r from-[#0076EB] to-[#0056b3] text-white rounded-br-lg' 
                        : 'bg-white text-gray-900 shadow-sm rounded-bl-lg'
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.isMe ? 'text-white/60' : 'text-gray-400'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0076EB] to-[#26B324] flex items-center justify-center text-white text-xs font-bold">
                    {listing.landlord.name.charAt(0)}
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-lg px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="bg-white border-t border-gray-200 px-3 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => notify("📎 Attachments coming soon!")}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#0076EB] hover:bg-gray-100 rounded-full transition"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <button
                onClick={() => notify("😊 Emoji picker coming soon!")}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#0076EB] hover:bg-gray-100 rounded-full transition"
              >
                <Smile className="h-5 w-5" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-[#0076EB] to-[#0056b3] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== LISTING DETAILS VIEW ==================== */
        <>
          {/* Image Gallery */}
          <div className="relative h-80 rounded-2xl overflow-hidden">
            <ImageCarousel 
              images={listing.images} 
              alt={listing.title}
              className="h-full w-full"
            />
            <div className="absolute top-4 left-4 bg-emerald-600 text-white text-[13px] font-semibold px-4 py-1.5 rounded-lg shadow-lg backdrop-blur-sm">
              {listing.availability}
            </div>
          </div>

          {/* Title and Price */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{listing.title}</h1>
              <span className="whitespace-nowrap"><span className="text-3xl font-extrabold text-[#0062CC]">${listing.price}</span><span className="text-sm text-gray-400 font-medium">/mo</span></span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-5 w-5" />
              <span>{listing.address}, {listing.neighborhood}</span>
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50/60 rounded-xl p-4 text-center border border-blue-100/50">
              <BedDouble className="h-5 w-5 text-[#0062CC] mx-auto mb-2" />
              <div className="text-2xl font-extrabold text-gray-900">{listing.bedrooms}</div>
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Bedrooms</div>
            </div>
            <div className="bg-blue-50/60 rounded-xl p-4 text-center border border-blue-100/50">
              <Bath className="h-5 w-5 text-[#0062CC] mx-auto mb-2" />
              <div className="text-2xl font-extrabold text-gray-900">{listing.bathrooms}</div>
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Bathrooms</div>
            </div>
            <div className="bg-blue-50/60 rounded-xl p-4 text-center border border-blue-100/50">
              <Maximize className="h-5 w-5 text-[#0062CC] mx-auto mb-2" />
              <div className="text-2xl font-extrabold text-gray-900">{listing.sqft}</div>
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Sq Ft</div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900">Description</h2>
            <p className="text-gray-700 leading-relaxed">{listing.description}</p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Type:</span>
              <span className="bg-gray-100 px-3 py-1 rounded-full">{listing.type}</span>
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900">Amenities</h2>
            <div className="grid grid-cols-2 gap-3">
              {listing.amenities.map((amenity) => (
                <div key={amenity} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="h-4 w-4 text-brand-green" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Landlord Info */}
          <div className="bg-slate-50/80 rounded-2xl p-5 space-y-4 border border-slate-100">
            <h2 className="text-lg font-bold text-gray-900">Property Owner</h2>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-[#0062CC] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-500/20">
                {listing.landlord.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">{listing.landlord.name}</h3>
                  {listing.landlord.verified && (
                    <CheckCircle2 className="h-4 w-4 text-[#0062CC]" />
                  )}
                </div>
                <p className="text-[13px] text-gray-500 mt-0.5">{listing.landlord.email}</p>
                <p className="text-[13px] text-gray-500">{listing.landlord.phone}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-white pt-4 pb-6 border-t border-gray-100 -mx-4 px-4 flex gap-3">
            <button 
              onClick={() => setShowChat(true)}
              className="flex-1 flex items-center justify-center gap-2.5 bg-[#0062CC] text-white py-3.5 rounded-xl font-semibold text-base hover:bg-[#004FAA] hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 shadow-md"
            >
              <div className="relative">
                <MessageCircle className="h-5 w-5" />
                {messages.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-3 w-3 bg-white rounded-full flex items-center justify-center">
                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  </span>
                )}
              </div>
              Chat with Landlord
              {messages.length > 0 && (
                <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {messages.length}
                </span>
              )}
            </button>
            <ShareButton
              title={listing.title}
              text={`Check out this property: ${listing.title}`}
              url={window.location.href}
              variant="button"
              className="flex-shrink-0"
            />
          </div>
        </>
      )}
    </div>
  );
}
