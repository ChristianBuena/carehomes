import { cn } from "@/lib/utils";

type SkeletonVariant = "text" | "card" | "circle" | "button";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

export function Skeleton({
  className,
  variant = "text",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-shimmer bg-[var(--color-border)]/50",
        {
          "rounded-md": variant === "text",
          "rounded-xl": variant === "card",
          "rounded-full": variant === "circle" || variant === "button",
          "h-4 w-full": variant === "text",
          "h-10 w-24": variant === "button",
          "h-32 w-full": variant === "card",
          "h-12 w-12": variant === "circle",
        },
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}
