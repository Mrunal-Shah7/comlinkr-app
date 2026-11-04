import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { chatThreads } from "../../../shared/data/mock/comlinkr.mock";
import Card from "../../../shared/ui/Card";

export default function ChatListPage() {
	return (
		<div className="space-y-5">
			<div className="rounded-3xl bg-gradient-to-br from-[#0076EB] via-blue-500 to-[#26B324] px-5 py-6 text-white shadow-lg">
				<p className="text-xs font-semibold uppercase tracking-wide text-white/80">Messages</p>
				<h2 className="mt-2 text-2xl font-bold">Your Conversations</h2>
				<p className="mt-1 text-sm text-white/90">Chat with community members</p>
			</div>

			<div className="space-y-3">
				{chatThreads.map((thread) => (
					<Link key={thread.id} to={`/app/chat/${thread.id}`}>
						<Card interactive className="flex items-center gap-4 p-4 hover:shadow-md transition-shadow">
							<div className="relative">
								<img 
									src={thread.participants[0]?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'} 
									alt={thread.title}
									className="h-12 w-12 rounded-full object-cover"
								/>
								{thread.unread ? (
									<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
										{thread.unread}
									</span>
								) : null}
							</div>
							<div className="flex-1 min-w-0">
								<h3 className="font-semibold text-gray-900 truncate">{thread.title}</h3>
								<p className="text-sm text-gray-500 truncate">{thread.preview}</p>
							</div>
							<div className="text-xs text-gray-400">{thread.lastMessageTime}</div>
						</Card>
					</Link>
				))}
				{chatThreads.length === 0 && (
					<div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
						<MessageCircle className="mx-auto h-12 w-12 text-gray-300" />
						<p className="mt-3 text-sm font-medium text-gray-500">No chats yet</p>
						<p className="mt-1 text-xs text-gray-400">Start a conversation from a listing</p>
					</div>
				)}
			</div>
		</div>
	);
}