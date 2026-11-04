import { useState } from "react";
import { X, Upload } from "lucide-react";
import Input from "../../../shared/ui/Input";
import Button from "../../../shared/ui/Button";
import { useToast } from "../../../shared/ui/Toast";
import { Restaurant } from "../../../shared/types/restaurant";

const STORAGE_KEY = "comlinkr_restaurants";

interface CreateRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateRestaurantModal({ isOpen, onClose }: CreateRestaurantModalProps) {
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
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

    if (imageFiles.length + validImages.length > 5) {
      notify("⚠️ Maximum 5 images allowed");
      return;
    }

    setImageFiles([...imageFiles, ...validImages]);
    
    validImages.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  if (!isOpen) return null;

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
      aiVerified: false,
    };

    // Save to localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const existing: Restaurant[] = stored ? JSON.parse(stored) : [];
      const updated = [newRestaurant, ...existing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("restaurants-updated"));
    } catch { /* ignore */ }

    // Simulate AI verification scan after 3 seconds
    const restaurantId = newRestaurant.id;
    setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const items: Restaurant[] = JSON.parse(stored);
          const idx = items.findIndex(r => r.id === restaurantId);
          if (idx !== -1) {
            items[idx].aiVerified = true;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            window.dispatchEvent(new Event("restaurants-updated"));
          }
        }
      } catch { /* ignore */ }
    }, 3000);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    notify("✅ Restaurant added successfully!");
    setIsSubmitting(false);
    
    // Clear form
    setName("");
    setCuisine("");
    setLocation("");
    setDescription("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[430px] rounded-t-3xl bg-white p-6 shadow-2xl animate-slideUp max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Add Restaurant</h2>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Restaurant Name *"
            placeholder="e.g., Joe's Pizza"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />

          <Input
            label="Cuisine Type *"
            placeholder="e.g., Italian, Mexican, Asian"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            disabled={isSubmitting}
          />

          <Input
            label="Location *"
            placeholder="e.g., Downtown, Main Street"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isSubmitting}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              placeholder="Tell us about this restaurant..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Restaurant Images {imageFiles.length > 0 && <span className="text-green-600">({imageFiles.length} uploaded)</span>}
            </label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#0076EB] hover:bg-blue-50 transition cursor-pointer">
              <Upload className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Upload Images</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                multiple
                onChange={handleImageChange}
                className="hidden"
                disabled={isSubmitting}
              />
            </label>
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-2">
                {imagePreviews.map((img, idx) => (
                  <img key={idx} src={img} alt={`Preview ${idx + 1}`} className="h-16 w-16 rounded-lg object-cover" />
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP (Max 5MB each, 5 images max)</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              tone="gray"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              tone="blue"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Restaurant"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
