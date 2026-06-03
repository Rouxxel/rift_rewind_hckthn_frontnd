import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md";
  className?: string;
}

export const LoadingSpinner = ({ size = "md", className }: LoadingSpinnerProps) => {
  const isSmall = size === "sm";
  return (
    <div
      className={cn(
        "relative rounded-full animate-spin shadow-[0_0_18px_hsl(10_96%_70%/0.45)]",
        "border-primary/20 border-t-coral border-r-hot",
        isSmall ? "h-[22px] w-[22px] border-2" : "h-14 w-14 border-[3px]",
        className
      )}
    >
      {!isSmall && (
        <span
          aria-hidden
          className="absolute -inset-2.5 rounded-full border border-dashed border-primary/35 animate-spin"
          style={{ animationDuration: "6s", animationDirection: "reverse" }}
        />
      )}
    </div>
  );
};
