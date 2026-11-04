import { ID, Location } from "./common";

export type Restaurant = {
	id: ID;
	name: string;
	cuisine: string;
	rating: number;
	distance: string;
	image?: string;
	location: Location;
	price: "$" | "$$" | "$$$";
	saved?: boolean;
	aiVerified?: boolean;
};
