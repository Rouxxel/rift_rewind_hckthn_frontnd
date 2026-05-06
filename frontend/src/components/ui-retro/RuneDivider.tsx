import { cn } from "@/lib/utils";

interface RuneDividerProps {
  className?: string;
  label?: string;
}

export const RuneDivider = ({ className, label }: RuneDividerProps) => {
  return (
    <div className={cn("flex items-center gap-3 my-6", className)}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="flex items-center gap-2 text-primary">
        <span className="block h-2 w-2 rotate-45 bg-primary shadow-halo" />
        {label && (
          <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/90">
            {label}
          </span>
        )}
        <span className="block h-2 w-2 rotate-45 bg-primary shadow-halo" />
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
    </div>
  );
};
