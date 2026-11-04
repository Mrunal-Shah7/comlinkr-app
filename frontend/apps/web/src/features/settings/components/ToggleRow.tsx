import Card from "../../../shared/ui/Card";

export default function ToggleRow({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description?: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {description ? <p className="text-xs text-gray-500">{description}</p> : null}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`h-6 w-11 rounded-full p-1 transition ${enabled ? "bg-gray-900" : "bg-gray-200"}`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition ${enabled ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </Card>
  );
}
