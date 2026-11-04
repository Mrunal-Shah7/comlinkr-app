import Button from "../Button";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
      <div className="text-base font-semibold text-gray-900">{title}</div>
      {description ? <p className="text-sm text-gray-500">{description}</p> : null}
      {actionLabel ? (
        <Button variant="primary" tone="blue" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
