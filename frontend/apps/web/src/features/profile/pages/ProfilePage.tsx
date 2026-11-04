import { Link } from "react-router-dom";
import ProfileHeader from "../components/ProfileHeader";
import ProfileStats from "../components/ProfileStats";
import PreferencesSummary from "../components/PreferencesSummary";
import { getProfile, getSavedItems, getInterestedEvents } from "../../../shared/lib/storage";
import { useAuth } from "../../../app/providers/AuthProvider";

export default function ProfilePage() {
	const { user } = useAuth();
	const profile = getProfile();
	const savedCount = getSavedItems().length;
	const interestedCount = getInterestedEvents().length;
	return (
		<div className="space-y-5">
			<ProfileHeader
				name={user?.name ?? profile?.name ?? "ComLinkr User"}
				handle={user?.handle ?? "comlinkr_user"}
				city={profile?.city ?? user?.city ?? "Set your city"}
				email={user?.email}
			/>
			<ProfileStats stats={{ saved: savedCount, interested: interestedCount, posts: 8 }} />
			<PreferencesSummary />
			<Link to="/app/profile/edit">
				<button className="w-full py-3.5 rounded-2xl border-2 border-[#0076EB] text-[#0076EB] font-bold text-sm hover:bg-blue-50 transition-all">
					Edit Profile
				</button>
			</Link>

			<div className="mt-4">
				<h3 className="text-base font-bold text-gray-900 mb-3">Quick Actions</h3>
				<div className="space-y-2.5">
					<Link to="/app/favorites">
						<div className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
							<div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><span className="text-lg">📑</span></div>
							<div className="flex-1"><p className="text-sm font-bold text-gray-900">Saved</p><p className="text-xs text-gray-500">Restaurants, listings, and events</p></div>
						</div>
					</Link>
					<Link to="/app/interested">
						<div className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
							<div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center"><span className="text-lg">💛</span></div>
							<div className="flex-1"><p className="text-sm font-bold text-gray-900">Interested</p><p className="text-xs text-gray-500">Events you're tracking</p></div>
						</div>
					</Link>
					<Link to="/app/myposts">
						<div className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
							<div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center"><span className="text-lg">✏️</span></div>
							<div className="flex-1"><p className="text-sm font-bold text-gray-900">My Posts</p><p className="text-xs text-gray-500">Manage your posts and questions</p></div>
						</div>
					</Link>
					<Link to="/app/notifications">
						<div className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
							<div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center"><span className="text-lg">🔔</span></div>
							<div className="flex-1"><p className="text-sm font-bold text-gray-900">Notifications</p><p className="text-xs text-gray-500">Replies, reminders, updates</p></div>
						</div>
					</Link>
					<Link to="/app/settings">
						<div className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
							<div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center"><span className="text-lg">⚙️</span></div>
							<div className="flex-1"><p className="text-sm font-bold text-gray-900">Settings</p><p className="text-xs text-gray-500">Profile, notifications, privacy</p></div>
						</div>
					</Link>
				</div>
			</div>
		</div>
	);
}
