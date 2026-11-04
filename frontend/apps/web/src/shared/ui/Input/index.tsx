import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function Input({ label, className = "", ...props }: InputProps) {
  return (
    <label className="flex w-full flex-col gap-2 text-sm font-medium text-gray-600">
      {label ? <span>{label}</span> : null}
      <input
        className={`h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none ring-brand-blue/30 transition focus:ring-2 ${className}`}
        {...props}
      />
    </label>
  );
}
