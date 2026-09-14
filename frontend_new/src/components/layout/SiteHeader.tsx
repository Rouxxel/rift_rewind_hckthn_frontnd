import { Link } from "react-router-dom";
import logoHelmet from "@/assets/logo_helmet.jpeg";

export const SiteHeader = () => {
  return (
    <header className="relative z-20 border-b border-primary/30 bg-surface-inset/80 backdrop-blur">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="container flex items-center justify-between gap-4 py-3 sm:gap-6 sm:py-4">
        <Link to="/" className="group flex min-w-0 items-center gap-2 sm:gap-3">
          <img
            src={logoHelmet}
            alt="Lol Coach Logo"
            className="h-8 w-8 shrink-0 drop-shadow-[0_0_12px_hsl(10_96%_70%/0.7)] sm:h-10 sm:w-10"
          />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="font-blackletter text-xl tracking-wide text-ink text-glow sm:text-2xl">
              Lol Coach
            </span>
            <span className="mt-1 font-pixel text-[7px] uppercase tracking-[0.12em] text-primary/80 sm:text-[8px] sm:tracking-[0.3em]">
              Best · insights · summoner
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
};
