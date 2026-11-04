import EmptyState from "../../../shared/ui/EmptyState";

export default function FavoritesEmpty() {
	return (
		<EmptyState
			title="No saved items yet"
			description="Save restaurants and events to view them here later."
			actionLabel="Explore now"
		/>
	);
}
