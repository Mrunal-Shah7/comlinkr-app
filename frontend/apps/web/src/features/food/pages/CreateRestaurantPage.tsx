import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, UtensilsCrossed, MapPin, Image as ImageIcon, X } from "lucide-react";
import { useToast } from "../../../shared/ui/Toast";
import PageContainer from "../../../app/layout/PageContainer";
import { Restaurant } from "../../../shared/types/restaurant";

const STORAGE_KEY = "comlinkr_restaurants";

export default function CreateRestaurantPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { notify } = useToast();

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !cuisine || !location) {
      notify("⚠️ Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    // Build new restaurant object
    const newRestaurant: Restaurant = {
      id: `r_${Date.now()}`,
      name,
      cuisine,
      rating: 0,
      distance: "0.1 mi",
      image: imagePreviews[0] || "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=800&q=80",
      location: { city: "New York", area: location },
      price: "$$",
    };

    // Save to localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const existing: Restaurant[] = stored ? JSON.parse(stored) : [];
      const updated = [newRestaurant, ...existing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("restaurants-updated"));
    } catch { /* ignore */ }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    notify("✅ Restaurant added successfully!");
    setIsSubmitting(false);
    navigate("/app/food");
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <UtensilsCrossed className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Add Restaurant</h1>
          <p className="text-xs text-gray-500">Share your favorite spot</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="py-5 space-y-5">
        {/* Restaurant Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Restaurant Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Joe's Pizza"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition disabled:bg-gray-100"
          />
        </div>

        {/* Cuisine Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Cuisine Type <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Italian, Mexican, Asian"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition disabled:bg-gray-100"
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
              placeholder="e.g., Downtown, Main Street"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSubmitting}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description
          </label>
          <textarea
            placeholder="Tell us about this restaurant..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            rows={4}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 resize-none transition disabled:bg-gray-100"
          />
        </div>

        {/* Restaurant Images */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Restaurant Images {imagePreviews.length > 0 && <span className="text-green-600">({imagePreviews.length} uploaded)</span>}
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
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-500 flex flex-col items-center justify-center cursor-pointer transition">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                </label>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer">
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
                disabled={isSubmitting}
              />
            </label>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-3 pb-4">
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl font-semibold text-white hover:shadow-lg hover:shadow-orange-200 transition disabled:opacity-50"
          >
            {isSubmitting ? "Adding..." : "Add Restaurant"}
          </button>
        </div>
      </form>
    </PageContainer>
  );
}
