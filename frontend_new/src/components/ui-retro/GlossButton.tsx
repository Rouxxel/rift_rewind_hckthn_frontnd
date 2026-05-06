import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface GlossButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "gold";
  size?: "sm" | "md" | "lg";
}

const variantClasses: Record<NonNullable<GlossButtonProps["variant"]>, string> = {
  primary:
    "bg-gradient-coral text-primary-foreground border-primary/80 hover:shadow-halo",
  secondary:
    "bg-[linear-gradient(180deg,hsl(8_100%_70%)_0%,hsl(8_100%_55%)_50%,hsl(0_85%_42%)_100%)] text-secondary-foreground border-secondary/80 hover:shadow-halo",
  ghost:
    "bg-surface-raised/60 text-ink border-border hover:border-primary/70 hover:text-primary",
  gold:
    "bg-gradient-gold text-[hsl(277_50%_10%)] border-gold/80",
};

const sizeClasses: Record<NonNullable<GlossButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
};

export const GlossButton = forwardRef<HTMLButtonElement, GlossButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center font-display font-bold uppercase tracking-widest",
          "border-2 rounded-sm transition-all duration-200",
          "shadow-bevel active:translate-y-[1px] active:shadow-inner-glow",
          "before:absolute before:inset-0 before:rounded-[inherit] before:bg-sheen before:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <span className="relative z-10 drop-shadow-[0_1px_0_hsl(277_50%_8%/0.6)]">{children}</span>
      </button>
    );
  }
);
GlossButton.displayName = "GlossButton";
