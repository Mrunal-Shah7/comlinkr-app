import Input from "../../../shared/ui/Input";

export default function PostForm() {
	return (
		<div className="space-y-4">
			<Input label="Title" placeholder="Give your post a title" />
			<Input label="Description" placeholder="Share the details" />
			<div className="grid grid-cols-2 gap-3">
				<Input label="Date" placeholder="Feb 10" />
				<Input label="Time" placeholder="6:30 PM" />
			</div>
			<Input label="Location" placeholder="Neighborhood or venue" />
		</div>
	);
}
