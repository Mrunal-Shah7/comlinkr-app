export default function ChipRow({
  items,
  active,
  onChange,
  color,
}: {
  items: string[];
  active: string;
  onChange: (v: string) => void;
  color: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((x) => {
        const isActive = active === x;
        return (
          <button
            key={x}
            onClick={() => onChange(x)}
            className={`px-3 py-2 rounded-xl text-sm whitespace-nowrap border ${
              isActive ? "text-white" : "bg-white text-gray-800"
            }`}
            style={{
              backgroundColor: isActive ? color : "#fff",
              borderColor: isActive ? color : "#e5e7eb",
            }}
          >
            {x}
          </button>
        );
      })}
    </div>
  );
}
