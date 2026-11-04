import Input from "../../../shared/ui/Input";

export default function StepBasicInfo({ city, onChange }: { city: string; onChange: (value: string) => void }) {
	return (
		<div className="space-y-3">
			<h2 className="text-xl font-semibold text-gray-900">Choose your city</h2>
			<p className="text-sm text-gray-500">We’ll personalize your feed to nearby places.</p>
			<Input label="City" value={city} onChange={(e) => onChange(e.target.value)} />
		</div>
	);
}
