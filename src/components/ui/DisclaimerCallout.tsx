import { AlertTriangle, Info, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisclaimerCalloutProps {
  variant?: "warning" | "info" | "legal";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function DisclaimerCallout({
  variant = "info",
  title,
  children,
  className,
}: DisclaimerCalloutProps) {
  const styles = {
    warning: {
      container: "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20",
      icon: <AlertTriangle className="h-5 w-5 text-[var(--color-warning)] mt-0.5" />,
      title: "text-[var(--color-warning)]",
      text: "text-[var(--color-warning)]/90",
    },
    info: {
      container: "bg-[var(--color-secondary)]/10 border-[var(--color-secondary)]/20",
      icon: <Info className="h-5 w-5 text-[var(--color-secondary)] mt-0.5" />,
      title: "text-[var(--color-secondary)]",
      text: "text-[var(--color-text)]",
    },
    legal: {
      container: "bg-[var(--color-primary)]/5 border-[var(--color-primary)]/10",
      icon: <Scale className="h-5 w-5 text-[var(--color-primary)] mt-0.5" />,
      title: "text-[var(--color-primary)]",
      text: "text-[var(--color-text)]",
    },
  };

  const activeStyle = styles[variant];

  return (
    <div
      className={cn(
        "rounded-xl border p-4 sm:p-5 flex gap-4 shadow-sm",
        activeStyle.container,
        className
      )}
    >
      <div className="shrink-0">{activeStyle.icon}</div>
      <div className="flex-1">
        {title && (
          <h4 className={cn("font-semibold mb-1", activeStyle.title)}>
            {title}
          </h4>
        )}
        <div className={cn("text-sm leading-relaxed", activeStyle.text)}>
          {children}
        </div>
      </div>
    </div>
  );
}
