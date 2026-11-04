import React from "react";

export default function PrimaryButton({
  children,
  color = "#111",
  onClick,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  color?: string;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white active:scale-[0.99] ${className}`}
      style={{ backgroundColor: color }}
    >
      {children}
    </button>
  );
}
