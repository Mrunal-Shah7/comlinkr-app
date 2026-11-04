import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Heart, Sparkles, CheckCircle2, ChevronDown, ArrowLeft } from "lucide-react";
import { setProfile } from "../../../shared/lib/storage";
import { useAuth } from "../../../app/providers/AuthProvider";

const CITIES = [
  "New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
  "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
  "Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte"
];

const CULTURE_OPTIONS = [
  { id: "coffee", label: "Coffee Culture", emoji: "☕" },
  { id: "art", label: "Art & Museums", emoji: "🎨" },
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "nightlife", label: "Nightlife", emoji: "🌙" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { id: "wellness", label: "Wellness", emoji: "🧘" },
  { id: "foodie", label: "Foodie", emoji: "🍕" },
  { id: "outdoor", label: "Outdoor", emoji: "🏕️" },
];

const INTEREST_OPTIONS = [
  { id: "housing", label: "Housing", icon: "🏠", desc: "Find your perfect home" },
  { id: "food", label: "Food", icon: "🍽️", desc: "Discover restaurants" },
  { id: "community", label: "Community", icon: "👥", desc: "Connect with locals" },
  { id: "events", label: "Events", icon: "🎉", desc: "Never miss out" },
];

const steps = ["City", "Culture", "Interests", "Ready"];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { updateProfile, user } = useAuth();
  const [step, setStep] = useState(0);
  const [city, setCity] = useState("");
  const [culture, setCulture] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const goNext = () => setStep((p) => Math.min(p + 1, steps.length - 1));
  const goBack = () => setStep((p) => Math.max(p - 1, 0));

  const toggleCulture = (id: string) => {
    setCulture((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const toggleInterest = (id: string) => {
    setInterests((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleFinish = () => {
    const profileData = { name: user?.name ?? "ComLinkr User", city, culture, interests };
    setProfile(profileData);
    if (user?.email) {
      localStorage.setItem(`comlinkr_profile_${user.email}`, JSON.stringify(profileData));
    }
    updateProfile({ city, onboardingDone: true });
    navigate("/app/feed");
  };

  const canProceed = () => {
    if (step === 0) return city.length > 0;
    if (step === 1) return culture.length > 0;
    if (step === 2) return interests.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <div className="px-4 pt-6 pb-4">
        <div className="max-w-[430px] mx-auto flex items-center justify-between">
          {step > 0 ? (
            <button onClick={goBack} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          ) : <div className="w-10" />}
          <div className="flex items-center gap-2">
            {steps.map((_, idx) => (
              <div key={idx} className={`h-2 rounded-full transition-all ${idx === step ? "w-8 bg-gradient-to-r from-[#0076EB] to-[#26B324]" : idx < step ? "w-2 bg-[#26B324]" : "w-2 bg-gray-200"}`} />
            ))}
          </div>
          <span className="text-sm font-medium text-gray-400">{step + 1}/{steps.length}</span>
        </div>
      </div>

      <div className="flex-1 px-4 pb-6">
        <div className="max-w-[430px] mx-auto">
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#0076EB] to-[#26B324] rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                  <MapPin className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Where are you located?</h1>
                <p className="text-gray-500 mt-2">We'll personalize your feed with local content</p>
              </div>
              <div className="relative">
                <button onClick={() => setShowDropdown(!showDropdown)} className="w-full px-4 py-4 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-between hover:border-[#0076EB] transition">
                  <span className={city ? "text-gray-900 font-medium" : "text-gray-400"}>{city || "Select your city"}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition ${showDropdown ? "rotate-180" : ""}`} />
                </button>
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-10 max-h-64 overflow-y-auto">
                    {CITIES.map((c) => (
                      <button key={c} onClick={() => { setCity(c); setShowDropdown(false); }} className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between ${city === c ? "bg-blue-50" : ""}`}>
                        <span className={city === c ? "text-[#0076EB] font-medium" : "text-gray-700"}>{c}</span>
                        {city === c && <CheckCircle2 className="w-5 h-5 text-[#0076EB]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-sm text-blue-700">💡 You can change your city later in Settings</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#FF7B00] to-[#FF5722] rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-orange-200">
                  <Heart className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">What do you enjoy?</h1>
                <p className="text-gray-500 mt-2">Select your cultural preferences</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CULTURE_OPTIONS.map((opt) => (
                  <button key={opt.id} onClick={() => toggleCulture(opt.id)} className={`p-4 rounded-2xl border-2 text-left transition-all ${culture.includes(opt.id) ? "border-[#0076EB] bg-blue-50 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    <span className="text-2xl mb-2 block">{opt.emoji}</span>
                    <span className={`text-sm font-semibold ${culture.includes(opt.id) ? "text-[#0076EB]" : "text-gray-700"}`}>{opt.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-gray-400">Selected: {culture.length} / {CULTURE_OPTIONS.length}</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#26B324] to-[#1a8a1a] rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-green-200">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">What interests you?</h1>
                <p className="text-gray-500 mt-2">We'll highlight these sections for you</p>
              </div>
              <div className="space-y-3">
                {INTEREST_OPTIONS.map((opt) => (
                  <button key={opt.id} onClick={() => toggleInterest(opt.id)} className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${interests.includes(opt.id) ? "border-[#26B324] bg-green-50 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    <span className="text-3xl">{opt.icon}</span>
                    <div className="flex-1">
                      <p className={`font-bold ${interests.includes(opt.id) ? "text-[#26B324]" : "text-gray-900"}`}>{opt.label}</p>
                      <p className="text-sm text-gray-500">{opt.desc}</p>
                    </div>
                    {interests.includes(opt.id) && <CheckCircle2 className="w-6 h-6 text-[#26B324]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#0076EB] to-[#26B324] rounded-3xl flex items-center justify-center mb-4 shadow-lg">
                  <CheckCircle2 className="w-14 h-14 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">You're all set! 🎉</h1>
                <p className="text-gray-500 mt-2">Here's a quick summary</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-[#0076EB]" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">City</p>
                    <p className="font-bold text-gray-900">{city}</p>
                  </div>
                </div>
                <div className="p-4 border-b border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Culture</p>
                  <div className="flex flex-wrap gap-2">
                    {culture.map((c) => {
                      const opt = CULTURE_OPTIONS.find((o) => o.id === c);
                      return <span key={c} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">{opt?.emoji} {opt?.label}</span>;
                    })}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((i) => {
                      const opt = INTEREST_OPTIONS.find((o) => o.id === i);
                      return <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">{opt?.icon} {opt?.label}</span>;
                    })}
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-gray-400">You can update these anytime in Settings</p>
            </div>
          )}

        </div>
      </div>

      <div className="px-4 pb-8 pt-4 bg-white border-t border-gray-100">
        <div className="max-w-[430px] mx-auto">
          <button onClick={step === 3 ? handleFinish : goNext} disabled={!canProceed()} className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${canProceed() ? "bg-gradient-to-r from-[#0076EB] to-[#26B324] text-white shadow-lg shadow-blue-200 hover:shadow-xl" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
            {step === 3 ? "Let's Go! 🚀" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
