import EmptyState from "../../../shared/ui/EmptyState";

export default function InterestedEmpty() {
	return (
		<EmptyState
			title="No interested events"
			description="Tap Interested on events to see them here."
			actionLabel="Explore events"
		/>
	);
}
