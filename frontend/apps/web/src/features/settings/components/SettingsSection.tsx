export default function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="space-y-3">
			<p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
			<div className="space-y-3">{children}</div>
		</div>
	);
}
