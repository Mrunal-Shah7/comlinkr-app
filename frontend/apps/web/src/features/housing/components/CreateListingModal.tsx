import { useState } from "react";
import { X, Upload, Home, MapPin, DollarSign, BedDouble, Bath, Maximize, Image as ImageIcon } from "lucide-react";
import { useToast } from "../../../shared/ui/Toast";

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateListingModal({ isOpen, onClose }: CreateListingModalProps) {
  const { notify } = useToast();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sqft, setSqft] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [description, setDescription] = useState("");
  const [amenities, setAmenities] = useState("");
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const validImages = files.filter(file => {
      if (!file.type.startsWith("image/")) {
        notify("⚠️ Please select only image files");
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        notify("⚠️ Each image should be less than 5MB");
        return false;
      }
      return true;
    });

    if (imagePreviews.length + validImages.length > 5) {
      notify("⚠️ Maximum 5 images allowed");
      return;
    }
    
    validImages.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(index: number) {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setTitle("");
    setPrice("");
    setBedrooms("");
    setBathrooms("");
    setSqft("");
    setAddress("");
    setNeighborhood("");
    setDescription("");
    setAmenities("");
    setImagePreviews([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      notify("✅ Listing created successfully!");
      setIsSubmitting(false);
      resetForm();
      onClose();
    }, 500);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div 
        className="relative w-full max-w-[430px] bg-white rounded-t-[28px] shadow-2xl max-h-[92vh] overflow-hidden flex flex-col animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10">
          <div className="flex items-center justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
          <div className="px-5 pb-4 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0076EB] to-[#26B324] flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Create Listing</h2>
                <p className="text-xs text-gray-500">List your property</p>
              </div>
            </div>
            <button 
              onClick={() => { resetForm(); onClose(); }} 
              className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Property Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Modern 2BR Apartment in Midtown"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
            />
          </div>

          {/* Price & Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Price/month <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  placeholder="2500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sq. Feet <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Maximize className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  placeholder="1200"
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
                />
              </div>
            </div>
          </div>

          {/* Bedrooms & Bathrooms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bedrooms <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  placeholder="2"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bathrooms <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Bath className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  placeholder="1"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="123 Main St, Apt 4B"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
              />
            </div>
          </div>

          {/* Neighborhood */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Neighborhood <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Midtown"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 resize-none transition"
              rows={3}
              placeholder="Describe the property, unique features..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Amenities
            </label>
            <input
              type="text"
              placeholder="Gym, Pool, Parking, Pet Friendly"
              value={amenities}
              onChange={(e) => setAmenities(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0076EB] focus:ring-2 focus:ring-[#0076EB]/10 transition"
            />
            <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
          </div>

          {/* Property Images */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Property Images
            </label>
            {imagePreviews.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {imagePreviews.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden">
                    <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 5 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-[#0076EB] flex flex-col items-center justify-center cursor-pointer transition">
                    <Upload className="w-5 h-5 text-gray-400" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-[#0076EB] hover:bg-blue-50/50 transition cursor-pointer">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-700">Tap to upload images</span>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP • Max 5 images</p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 pb-4">
            <button 
              type="button"
              onClick={() => { resetForm(); onClose(); }}
              disabled={isSubmitting}
              className="flex-1 py-3.5 px-4 border-2 border-gray-200 rounded-2xl font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3.5 px-4 bg-gradient-to-r from-[#0076EB] to-[#26B324] rounded-2xl font-semibold text-white hover:shadow-lg hover:shadow-blue-200 transition disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
