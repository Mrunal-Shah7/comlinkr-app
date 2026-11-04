import Card from "../../../shared/ui/Card";
import { getProfile } from "../../../shared/lib/storage";

const CULTURE_MAP: Record<string, { label: string; emoji: string }> = {
  coffee: { label: "Coffee Culture", emoji: "☕" },
  art: { label: "Art & Museums", emoji: "🎨" },
  fitness: { label: "Fitness", emoji: "💪" },
  nightlife: { label: "Nightlife", emoji: "🌙" },
  family: { label: "Family", emoji: "👨‍👩‍👧" },
  wellness: { label: "Wellness", emoji: "🧘" },
  foodie: { label: "Foodie", emoji: "🍕" },
  outdoor: { label: "Outdoor", emoji: "🏕️" },
};

const INTEREST_MAP: Record<string, { label: string; icon: string }> = {
  housing: { label: "Housing", icon: "🏠" },
  food: { label: "Food", icon: "🍽️" },
  community: { label: "Community", icon: "👥" },
  events: { label: "Events", icon: "🎉" },
};

export default function PreferencesSummary() {
  const profile = getProfile();
  const cultureItems = profile?.culture ?? [];
  const interestItems = profile?.interests ?? [];

  if (cultureItems.length === 0 && interestItems.length === 0) {
    return (
      <Card>
        <p className="text-base font-bold text-gray-900 mb-1">Your preferences</p>
        <p className="text-sm text-gray-500">Complete onboarding to set your preferences</p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-base font-bold text-gray-900 mb-1">Your preferences</p>
      <p className="text-xs text-gray-500 mb-3">What you love about your city</p>
      {cultureItems.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Culture</p>
          <div className="flex flex-wrap gap-2">
            {cultureItems.map((id) => {
              const item = CULTURE_MAP[id];
              return item ? (
                <span key={id} className="rounded-full bg-gradient-to-r from-orange-50 to-orange-100 px-3 py-1.5 text-sm font-semibold text-orange-700 border border-orange-200">
                  {item.emoji} {item.label}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
      {interestItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Interests</p>
          <div className="flex flex-wrap gap-2">
            {interestItems.map((id) => {
              const item = INTEREST_MAP[id];
              return item ? (
                <span key={id} className="rounded-full bg-gradient-to-r from-green-50 to-green-100 px-3 py-1.5 text-sm font-semibold text-green-700 border border-green-200">
                  {item.icon} {item.label}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
