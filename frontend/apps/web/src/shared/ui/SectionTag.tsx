export default function SectionTag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
