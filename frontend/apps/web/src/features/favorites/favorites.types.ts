export type FavoriteItem = {
	id: string;
	type: "food" | "event" | "housing";
	title: string;
	subtitle: string;
	image?: string;
	meta?: string;
};
