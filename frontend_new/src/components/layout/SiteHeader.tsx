import { Link } from "react-router-dom";
import { GlossButton } from "@/components/ui-retro/GlossButton";
import logoHelmet from "@/assets/logo_helmet.png";

export const SiteHeader = () => {
  return (
    <header className="relative z-20 border-b border-primary/30 bg-surface-inset/80 backdrop-blur">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="container flex items-center justify-between gap-6 py-4">
        <Link to="/" className="group flex items-center gap-3">
          <img
            src={logoHelmet}
            alt="Lol Coach Logo"
            className="h-10 w-10 drop-shadow-[0_0_12px_hsl(10_96%_70%/0.7)]"
          />
          <span className="flex flex-col leading-none">
            <span className="font-blackletter text-2xl tracking-wide text-ink text-glow">
              Lol Coach
            </span>
            <span className="font-pixel text-[8px] uppercase tracking-[0.3em] text-primary/80">
              Best · insights · summoner
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
};
