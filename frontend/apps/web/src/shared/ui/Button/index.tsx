import React from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

type ButtonTone = "blue" | "orange" | "green" | "gray";

type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
};

const toneMap: Record<ButtonTone, string> = {
  blue: "bg-brand-blue text-white",
  orange: "bg-brand-orange text-white",
  green: "bg-brand-green text-white",
  gray: "bg-gray-900 text-white",
};

const outlineToneMap: Record<ButtonTone, string> = {
  blue: "border-brand-blue text-brand-blue",
  orange: "border-brand-orange text-brand-orange",
  green: "border-brand-green text-brand-green",
  gray: "border-gray-300 text-gray-700",
};

const sizeMap: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export default function Button({
  variant = "primary",
  tone = "gray",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "btn-active inline-flex items-center justify-center gap-2 rounded-full font-semibold transition";

  const variantClass =
    variant === "primary"
      ? toneMap[tone]
      : variant === "secondary"
        ? "bg-gray-100 text-gray-900"
        : variant === "outline"
          ? `border ${outlineToneMap[tone]} bg-white`
          : "bg-transparent text-gray-600";

  return (
    <button className={`${base} ${sizeMap[size]} ${variantClass} ${className}`} {...props} />
  );
}
