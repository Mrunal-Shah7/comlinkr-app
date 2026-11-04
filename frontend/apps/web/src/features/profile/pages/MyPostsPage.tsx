import { useState } from "react";
import SectionHeader from "../../../app/layout/SectionHeader";
import Card from "../../../shared/ui/Card";
import Button from "../../../shared/ui/Button";
import Skeleton from "../../../shared/ui/Skeleton";
import EmptyState from "../../../shared/ui/EmptyState";
import { useToast } from "../../../shared/ui/Toast";

const TABS = ["News", "Events", "Questions"];

export default function MyPostsPage() {
  const { notify } = useToast();
  const [active, setActive] = useState(TABS[0]);
  const [loading] = useState(false);
  const posts = [] as { id: string; title: string; meta: string }[];

  return (
    <div className="space-y-5">
      <SectionHeader title="My Posts" />
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              active === tab ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
            }`}
            onClick={() => setActive(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState title="No posts yet" description="Create your first post to see it here." />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{post.title}</p>
                <p className="text-xs text-gray-500">{post.meta}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" tone="gray" size="sm" onClick={() => notify("Edit coming soon")}
                >
                  Edit
                </Button>
                <Button variant="outline" tone="gray" size="sm" onClick={() => notify("Delete coming soon")}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
