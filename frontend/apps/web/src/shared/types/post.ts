import { ID, Location } from "./common";
import { User } from "./user";

export type NewsPost = {
	id: ID;
	title: string;
	summary: string;
	image?: string;
	category: "news";
	location: Location;
	author: User;
	time: string;
};

export type EventPost = {
	id: ID;
	title: string;
	description: string;
	image?: string;
	date: string;
	time: string;
	location: Location;
	host: User;
	attendees: User[];
	category: "events";
	aiVerified?: boolean;
};
