import { ID } from "./common";

export type User = {
	id: ID;
	name: string;
	handle: string;
	city?: string;
	avatar?: string;
};
