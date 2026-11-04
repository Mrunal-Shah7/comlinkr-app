import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../../shared/ui/Button";
import Card from "../../../shared/ui/Card";
import LivePreviewCard from "../components/LivePreviewCard";
import PhotoPicker from "../components/PhotoPicker";
import PostForm from "../components/PostForm";
import PostingRules from "../components/PostingRules";
import PostTypeSelector from "../components/PostTypeSelector";
import { PostType } from "../createPost.types";

export default function CreatePostPage() {
	const [type, setType] = useState<PostType>("event");

	return (
		<div className="space-y-5">
			<div className="rounded-3xl bg-gray-900 px-5 py-6 text-white">
				<p className="text-xs font-semibold uppercase tracking-wide text-white/70">Create Post</p>
				<h2 className="mt-2 text-2xl font-semibold">Share with your city</h2>
				<p className="mt-1 text-sm text-white/70">Publish news or start a new event.</p>
			</div>

			<PostTypeSelector value={type} onChange={setType} />

			<Card>
				<h3 className="text-sm font-semibold text-gray-900">Create {type === "event" ? "Event" : "News"}</h3>
				<div className="mt-3 space-y-4">
					<PhotoPicker />
					<PostForm />
				</div>
				<Button variant="primary" tone={type === "event" ? "orange" : "blue"} className="mt-5 w-full">
					Publish {type === "event" ? "Event" : "News"}
				</Button>
			</Card>

			<LivePreviewCard />
			<PostingRules />

			<Link to="/app/published" className="block">
				<Button variant="outline" tone="gray" className="w-full">
					Preview success screen
				</Button>
			</Link>
		</div>
	);
}
