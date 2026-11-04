import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import Card from "../../../shared/ui/Card";

export default function SettingsRow({
	title,
	description,
	icon,
	right,
}: {
	title: string;
	description?: string;
	icon?: ReactNode;
	right?: ReactNode;
}) {
	return (
		<Card className="flex items-center justify-between">
			<div className="flex items-center gap-3">
				{icon ? <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">{icon}</div> : null}
				<div>
					<p className="text-sm font-semibold text-gray-900">{title}</p>
					{description ? <p className="text-xs text-gray-500">{description}</p> : null}
				</div>
			</div>
			{right ?? <ChevronRight className="h-4 w-4 text-gray-400" />}
		</Card>
	);
}
