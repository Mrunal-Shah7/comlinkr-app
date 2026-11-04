import { Link } from "react-router-dom";
import Button from "../../../shared/ui/Button";
import Card from "../../../shared/ui/Card";

export default function PostPublishedPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6">
      <Card className="w-full text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Post Published</h2>
        <p className="mt-2 text-sm text-gray-500">
          Your update is live. We’ll notify you when people react.
        </p>
        <Link to="/app/feed" className="mt-6 block">
          <Button variant="primary" tone="blue" className="w-full">
            Back to Feed
          </Button>
        </Link>
      </Card>
    </div>
  );
}
