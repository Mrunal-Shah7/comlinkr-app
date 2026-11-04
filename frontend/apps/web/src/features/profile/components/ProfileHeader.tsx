import Avatar from "../../../shared/ui/Avatar";
import { CheckCircle2, MapPin, Mail, Calendar } from "lucide-react";

interface ProfileHeaderProps {
  name: string;
  handle: string;
  city: string;
  verified?: boolean;
  bio?: string;
  email?: string;
  joinedDate?: string;
}

export default function ProfileHeader({ 
  name, 
  handle, 
  city, 
  verified = true,
  bio = "Exploring the city, one connection at a time.",
  email = "user@comlinkr.com",
  joinedDate = "Jan 2026"
}: ProfileHeaderProps) {
	return (
		<div className="rounded-3xl bg-gradient-to-br from-brand-blue via-blue-600 to-blue-700 px-5 py-6 text-white shadow-2xl border-2 border-blue-400">
			<div className="flex items-start gap-4 mb-4">
				<Avatar size="lg" fallback={name.slice(0, 2).toUpperCase()} className="ring-4 ring-white/30 shadow-xl" />
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						<p className="text-xl font-bold text-white drop-shadow-sm">{name}</p>
						{verified && (
							<CheckCircle2 className="h-5 w-5 text-green-300 drop-shadow-sm" aria-label="Verified" />
						)}
					</div>
					<p className="text-sm text-white/95 mb-2 font-medium">@{handle}</p>
					<p className="text-sm text-white/95 leading-relaxed font-normal">{bio}</p>
				</div>
			</div>
			<div className="flex flex-wrap gap-4 text-sm text-white/95 font-medium">
				<div className="flex items-center gap-1.5">
					<MapPin className="h-4 w-4" />
					<span>{city}</span>
				</div>
				<div className="flex items-center gap-1.5">
					<Mail className="h-4 w-4" />
					<span>{email}</span>
				</div>
				<div className="flex items-center gap-1.5">
					<Calendar className="h-4 w-4" />
					<span>Joined {joinedDate}</span>
				</div>
			</div>
		</div>
	);
}
