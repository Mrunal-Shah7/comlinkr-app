type AvatarProps = {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  fallback?: string;
  className?: string;
};

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export default function Avatar({
  src,
  alt,
  size = "md",
  fallback = "CL",
  className = "",
}: AvatarProps) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-full bg-gray-200 text-gray-600 ${
        sizeMap[size]
      } ${className}`}
    >
      {src ? <img src={src} alt={alt ?? "avatar"} className="h-full w-full object-cover" /> : fallback}
    </div>
  );
}
