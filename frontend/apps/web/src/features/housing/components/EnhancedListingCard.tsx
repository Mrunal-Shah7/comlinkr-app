import { MapPin, BedDouble, Bath, Maximize, CheckCircle2, MessageCircle, ShieldCheck } from "lucide-react";
import { Listing } from "../housing.types";
import ImageCarousel from "../../../shared/ui/ImageCarousel";
import ShareButton from "../../../shared/ui/ShareButton";
import { useNavigate } from "react-router-dom";

interface EnhancedListingCardProps {
  listing: Listing;
}

export default function EnhancedListingCard({ listing }: EnhancedListingCardProps) {
  const navigate = useNavigate();

  return (
    <div 
      className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_6px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_12px_28px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100/80"
      onClick={() => navigate(`/app/housing/${listing.id}`)}
    >
      {/* Image Carousel */}
      <div className="relative h-52">
        <ImageCarousel 
          images={listing.images} 
          alt={listing.title}
          className="h-full w-full"
        />
        {/* Availability Badge */}
        <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-sm">
          {listing.availability}
        </div>
        {/* AI Verified Badge */}
        {listing.aiVerified && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur text-emerald-600 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg">
            <ShieldCheck className="h-3.5 w-3.5" /> AI Verified
          </div>
        )}
        {listing.aiVerified === false && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur text-amber-600 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg animate-pulse">
            🔍 Scanning…
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title and Price */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[17px] font-bold text-gray-900 leading-snug flex-1">{listing.title}</h3>
          <div className="text-right flex-shrink-0">
            <span className="text-xl font-extrabold text-[#0062CC]">${listing.price}</span>
            <span className="text-xs text-gray-400 font-medium">/mo</span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-gray-500">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-[13px]">{listing.neighborhood}</span>
        </div>

        {/* Property Details */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg">
            <BedDouble className="h-3.5 w-3.5 text-[#0062CC]" />
            <span className="font-medium text-gray-700">{listing.bedrooms} Beds</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg">
            <Bath className="h-3.5 w-3.5 text-[#0062CC]" />
            <span className="font-medium text-gray-700">{listing.bathrooms} Baths</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg">
            <Maximize className="h-3.5 w-3.5 text-[#0062CC]" />
            <span className="font-medium text-gray-700">{listing.sqft} sqft</span>
          </div>
        </div>

        {/* Amenities */}
        <div className="flex flex-wrap gap-1.5">
          {listing.amenities.slice(0, 4).map((amenity) => (
            <span 
              key={amenity}
              className="text-[11px] font-medium bg-blue-50 text-[#0062CC] px-2.5 py-1 rounded-md"
            >
              {amenity}
            </span>
          ))}
          {listing.amenities.length > 4 && (
            <span className="text-[11px] font-medium bg-gray-50 text-gray-500 px-2.5 py-1 rounded-md">
              +{listing.amenities.length - 4} more
            </span>
          )}
        </div>

        {/* Landlord Info */}
        <div className="flex items-center gap-2.5 pt-3 border-t border-gray-100">
          {listing.landlord.avatar ? (
            <img 
              src={listing.landlord.avatar} 
              alt={listing.landlord.name}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-100"
            />
          ) : (
            <div className="h-9 w-9 rounded-full ring-2 ring-gray-100 bg-gradient-to-br from-[#0062CC] to-[#004AAD] flex items-center justify-center text-white text-sm font-bold">
              {listing.landlord.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-gray-900">{listing.landlord.name}</span>
              {listing.landlord.verified && (
                <CheckCircle2 className="h-3.5 w-3.5 text-[#0062CC]" />
              )}
            </div>
            <span className="text-[11px] text-gray-400 font-medium">Property Owner</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/app/housing/${listing.id}?chat=true`);
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-[#0062CC] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[#004FAA] hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200"
          >
            <MessageCircle className="h-4 w-4" />
            Chat
          </button>
          <ShareButton
            title={listing.title}
            text={`Check out this property: ${listing.title}`}
            url={`${window.location.origin}/app/housing/${listing.id}`}
            variant="button"
            className="flex-shrink-0"
          />
        </div>
      </div>
    </div>
  );
}
