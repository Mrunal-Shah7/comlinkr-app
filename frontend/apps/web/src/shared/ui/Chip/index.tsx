type ChipProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export default function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip ${active ? "chip-active" : "chip-inactive"}`}
    >
      {label}
    </button>
  );
}
