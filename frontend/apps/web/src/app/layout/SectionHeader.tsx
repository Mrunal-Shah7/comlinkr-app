import React from "react";

export default function SectionHeader({
	title,
	action,
}: {
	title: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="mb-3 mt-6 flex items-center justify-between">
			<h2 className="text-lg font-semibold text-gray-900">{title}</h2>
			{action}
		</div>
	);
}
