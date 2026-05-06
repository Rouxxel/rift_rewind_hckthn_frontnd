import { cn } from "@/lib/utils";
import { forwardRef, HTMLAttributes } from "react";

interface BevelPanelProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  inset?: boolean;
}

export const BevelPanel = forwardRef<HTMLDivElement, BevelPanelProps>(
  ({ className, glow, inset, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "panel-bevel rounded-sm",
          glow && "shadow-halo",
          inset && "bg-surface-inset",
          className
        )}
        {...props}
      >
        {/* Corner ornaments */}
        <span className="pointer-events-none absolute left-1 top-1 h-3 w-3 border-l-2 border-t-2 border-primary/70" />
        <span className="pointer-events-none absolute right-1 top-1 h-3 w-3 border-r-2 border-t-2 border-primary/70" />
        <span className="pointer-events-none absolute bottom-1 left-1 h-3 w-3 border-b-2 border-l-2 border-primary/70" />
        <span className="pointer-events-none absolute bottom-1 right-1 h-3 w-3 border-b-2 border-r-2 border-primary/70" />
        <div className="relative">{children}</div>
      </div>
    );
  }
);
BevelPanel.displayName = "BevelPanel";
