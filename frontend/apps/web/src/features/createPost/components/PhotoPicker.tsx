import { ImagePlus } from "lucide-react";

export default function PhotoPicker() {
	return (
		<div className="flex items-center justify-between rounded-2xl border border-dashed border-gray-200 bg-white p-4">
			<div>
				<p className="text-sm font-semibold text-gray-900">Add cover photo</p>
				<p className="text-xs text-gray-500">Optional, but posts with images get more views.</p>
			</div>
			<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
				<ImagePlus className="h-5 w-5" />
			</div>
		</div>
	);
}
