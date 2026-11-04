import { Heart, MessageCircle, Bookmark, MapPin, Clock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import ShareButton from "../../../shared/ui/ShareButton";

export interface NewsPost {
  id: string;
  title: string;
  summary: string;
  image?: string;
  author: {
    name: string;
    avatar: string;
  };
  timestamp: string;
  location?: string;
  category: string;
  likes: number;
  comments: number;
  isLiked?: boolean;
  isSaved?: boolean;
  aiVerified?: boolean;
}

interface EnhancedNewsCardProps {
  post: NewsPost;
}

export default function EnhancedNewsCard({ post }: EnhancedNewsCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [likes, setLikes] = useState(post.likes);

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
  }

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    setIsSaved(!isSaved);
  }

  return (
    <article className="bg-white rounded-2xl shadow-brand-md hover:shadow-brand-lg transition-all overflow-hidden">
      {/* Author Header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <img 
          src={post.author.avatar} 
          alt={post.author.name}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">{post.author.name}</h4>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>{post.timestamp}</span>
            {post.location && (
              <>
                <span>·</span>
                <MapPin className="h-3 w-3" />
                <span>{post.location}</span>
              </>
            )}
          </div>
        </div>
        <span className="text-xs bg-brand-blue/10 text-brand-blue px-2.5 py-1 rounded-full font-medium">
          {post.category}
        </span>
        {post.aiVerified && (
          <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-semibold ml-1">
            <ShieldCheck className="h-3 w-3" /> AI Verified
          </span>
        )}
        {post.aiVerified === false && (
          <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold ml-1 animate-pulse">
            🔍 Scanning…
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3 space-y-2">
        <h3 className="text-lg font-bold text-gray-900 leading-tight">{post.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{post.summary}</p>
      </div>

      {/* Image */}
      {post.image && (
        <div className="relative h-64 bg-gray-100">
          <img 
            src={post.image} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLike}
            className="flex items-center gap-2 text-sm font-medium transition group"
          >
            <Heart 
              className={`h-5 w-5 transition ${
                isLiked 
                  ? "fill-red-500 text-red-500" 
                  : "text-gray-600 group-hover:text-red-500"
              }`}
            />
            <span className={isLiked ? "text-red-500" : "text-gray-600"}>{likes}</span>
          </button>
          
          <button className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-blue transition group">
            <MessageCircle className="h-5 w-5 group-hover:text-brand-blue" />
            <span>{post.comments}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleSave}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <Bookmark 
              className={`h-5 w-5 transition ${
                isSaved 
                  ? "fill-brand-blue text-brand-blue" 
                  : "text-gray-600"
              }`}
            />
          </button>
          <ShareButton
            title={post.title}
            text={post.summary}
            url={`${window.location.origin}/app/feed/${post.id}`}
            variant="icon"
          />
        </div>
      </div>
    </article>
  );
}
