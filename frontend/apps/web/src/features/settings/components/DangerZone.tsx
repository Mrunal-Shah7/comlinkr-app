import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";
import Button from "../../../shared/ui/Button";
import Card from "../../../shared/ui/Card";

export default function DangerZone() {
	const navigate = useNavigate();
	const { logout } = useAuth();

	const handleLogout = () => {
		logout();
		navigate("/auth/login");
	};

	return (
		<Card className="border-red-100 bg-red-50">
			<p className="text-sm font-semibold text-red-700">Log out</p>
			<p className="mt-1 text-xs text-red-500">You can log back in anytime.</p>
			<Button variant="outline" tone="gray" size="sm" className="mt-3 w-full" onClick={handleLogout}>
				Log out
			</Button>
		</Card>
	);
}
