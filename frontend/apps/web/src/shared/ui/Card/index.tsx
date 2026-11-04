import React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export default function Card({ interactive = false, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${
        interactive ? "card-interactive" : ""
      } ${className}`}
      {...props}
    />
  );
}
