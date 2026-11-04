import { useState } from "react";
import { X } from "lucide-react";
import Button from "../../../shared/ui/Button";
import Input from "../../../shared/ui/Input";
import { CommunityQuestion } from "../community.types";
import { useToast } from "../../../shared/hooks/useToast";

type Props = {
	onClose: () => void;
	onSubmit: (question: CommunityQuestion) => void;
};

export default function AskQuestionSheet({ onClose, onSubmit }: Props) {
	const [title, setTitle] = useState("");
	const [excerpt, setExcerpt] = useState("");
	const [tags, setTags] = useState("");
	const [loading, setLoading] = useState(false);
	const { notify } = useToast();

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!title.trim() || !excerpt.trim()) {
			notify("Please fill in all required fields");
			return;
		}
		setLoading(true);
		
		const profile = JSON.parse(localStorage.getItem('comlinkr_profile') || '{}');
		const newQuestion: CommunityQuestion = {
			id: `q${Date.now()}`,
			title: title.trim(),
			excerpt: excerpt.trim(),
			tags: tags.split(',').map(t => t.trim()).filter(Boolean),
			votes: 0,
			answers: 0,
			author: profile.name || 'Anonymous',
			time: 'Just now',
		};

		setTimeout(() => {
			onSubmit(newQuestion);
			notify("Question posted successfully!");
			setTitle("");
			setExcerpt("");
			setTags("");
			setLoading(false);
		}, 300);
	}

	return (
		<>
			<div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={onClose} />
			<div className="fixed inset-x-4 top-1/2 z-[100] max-w-md -translate-y-1/2 mx-auto">
				<form onSubmit={handleSubmit} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl animate-slideUp">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-bold text-gray-900 bg-gradient-to-r from-[#0076EB] to-[#26B324] bg-clip-text text-transparent">
							Ask the Community
						</h3>
						<button 
							type="button"
							onClick={onClose}
							className="rounded-full p-1 hover:bg-gray-100 transition"
						>
							<X className="h-5 w-5 text-gray-500" />
						</button>
					</div>
					<div className="flex flex-col gap-4">
						<Input 
							label="Question Title" 
							placeholder="What do you need help with?" 
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
						/>
						<div>
							<label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
							<textarea 
								placeholder="Provide more details about your question..."
								value={excerpt}
								onChange={(e) => setExcerpt(e.target.value)}
								rows={3}
								className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-[#0076EB] focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20"
								required
							/>
						</div>
						<Input 
							label="Tags (comma separated)" 
							placeholder="e.g. food, housing, events" 
							value={tags}
							onChange={(e) => setTags(e.target.value)}
						/>
					</div>
					<div className="flex gap-2 mt-2">
						<Button 
							variant="secondary"
							type="button"
							onClick={onClose}
							className="flex-1"
						>
							Cancel
						</Button>
						<Button 
							variant="primary" 
							type="submit"
							className="flex-1 bg-gradient-to-r from-[#0076EB] to-[#26B324] hover:opacity-90" 
							disabled={loading}
						>
							{loading ? "Posting..." : "Post Question"}
						</Button>
					</div>
				</form>
			</div>
		</>
	);
}
