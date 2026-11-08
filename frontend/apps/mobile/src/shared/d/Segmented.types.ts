export type SegmentedProps = {
  items: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
};
