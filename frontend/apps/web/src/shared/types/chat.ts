import { ID } from "./common";
import { User } from "./user";

export type ChatMessage = {
	id: ID;
	text: string;
	sender: User;
	createdAt: string;
	isMe?: boolean;
};

export type ChatThread = {
	id: ID;
	title: string;
	preview: string;
	participants: User[];
	lastMessageTime: string;
	unread?: number;
};
