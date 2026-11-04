import { useState } from "react";
import { Bell, HelpCircle, Lock, MapPin, Shield, User, Info } from "lucide-react";
import SectionHeader from "../../../app/layout/SectionHeader";
import DangerZone from "../components/DangerZone";
import SettingsRow from "../components/SettingsRow";
import SettingsSection from "../components/SettingsSection";
import ToggleRow from "../components/ToggleRow";
import { useToast } from "../../../shared/ui/Toast";

export default function SettingsPage() {
	const { notify } = useToast();
	const [pushEnabled, setPushEnabled] = useState(true);
	const [emailEnabled, setEmailEnabled] = useState(false);

	return (
		<div className="space-y-6">
			<SectionHeader title="Settings" />

			<SettingsSection title="Account">
				<SettingsRow
					title="Account details"
					description="Update email and password"
					icon={<User className="h-5 w-5 text-gray-500" />}
					right={<button className="text-xs text-gray-500" onClick={() => notify("Coming soon")}>Edit</button>}
				/>
				<SettingsRow
					title="Profile"
					description="Edit your public profile"
					icon={<MapPin className="h-5 w-5 text-gray-500" />}
				/>
			</SettingsSection>

			<SettingsSection title="Preferences">
				<SettingsRow
					title="City"
					description="Update your location"
					icon={<MapPin className="h-5 w-5 text-gray-500" />}
				/>
				<SettingsRow
					title="Culture & interests"
					description="Tailor your feed"
					icon={<Shield className="h-5 w-5 text-gray-500" />}
				/>
			</SettingsSection>

			<SettingsSection title="Notifications">
				<ToggleRow
					title="Push notifications"
					description="Event reminders and updates"
					enabled={pushEnabled}
					onToggle={() => setPushEnabled((prev) => !prev)}
				/>
				<ToggleRow
					title="Email updates"
					description="Weekly summary"
					enabled={emailEnabled}
					onToggle={() => setEmailEnabled((prev) => !prev)}
				/>
			</SettingsSection>

			<SettingsSection title="Privacy & Safety">
				<SettingsRow
					title="Privacy"
					description="Manage visibility"
					icon={<Lock className="h-5 w-5 text-gray-500" />}
				/>
				<SettingsRow
					title="Blocked users"
					description="Manage blocked profiles"
					icon={<Shield className="h-5 w-5 text-gray-500" />}
				/>
			</SettingsSection>

			<SettingsSection title="Support">
				<SettingsRow
					title="Help center"
					description="FAQs and contact"
					icon={<HelpCircle className="h-5 w-5 text-gray-500" />}
				/>
				<SettingsRow
					title="Notifications"
					description="Manage alerts"
					icon={<Bell className="h-5 w-5 text-gray-500" />}
				/>
			</SettingsSection>

			<SettingsSection title="About">
				<SettingsRow
					title="ComLinkr"
					description="Version 0.1"
					icon={<Info className="h-5 w-5 text-gray-500" />}
				/>
			</SettingsSection>

			<DangerZone />
		</div>
	);
}
