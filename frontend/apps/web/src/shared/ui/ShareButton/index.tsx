import { Share2 } from "lucide-react";
import { useState } from "react";

interface ShareButtonProps {
  url?: string;
  title?: string;
  text?: string;
  className?: string;
  variant?: "icon" | "button" | "text";
}

export default function ShareButton({ 
  url, 
  title = "Check this out!", 
  text = "",
  className = "",
  variant = "button"
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url || window.location.href;
    
    // Try native Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: shareUrl
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fallback to copy
      }
    }

    // Fallback: copy to clipboard
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        alert(`Share this link: ${shareUrl}`);
      }
    } else {
      alert(`Share this link: ${shareUrl}`);
    }
  }

  if (variant === "icon") {
    return (
      <button
        onClick={handleShare}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition ${className}`}
        aria-label="Share"
      >
        <Share2 className="h-4 w-4" />
      </button>
    );
  }

  if (variant === "text") {
    return (
      <button
        onClick={handleShare}
        className={`inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-brand-blue transition ${className}`}
      >
        <Share2 className="h-4 w-4" />
        {copied ? "Copied!" : "Share"}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-xs font-medium shadow hover:bg-gray-200 transition ${className}`}
      aria-label="Share"
    >
      <Share2 className="h-4 w-4" />
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
