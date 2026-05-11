export const SiteFooter = () => {
  return (
    <footer className="relative z-10 border-t border-primary/30 bg-surface-inset/80 mt-16">
      <div className="container flex flex-col items-center justify-between gap-3 py-6 text-xs md:flex-row">
        <div className="flex items-center gap-2 font-pixel uppercase tracking-widest text-muted-foreground">
          <span className="block h-2 w-2 rounded-full bg-emerald-400 animate-blink-dot shadow-[0_0_8px_hsl(140_80%_60%)]" />
          Server Online · Patch 15.19.1
        </div>
        <p className="font-display uppercase tracking-[0.3em] text-muted-foreground">
          © 2026 LoL Coach · Not affiliated with Riot Games
        </p>
        <p className="font-pixel text-[9px] text-primary/70">v1.1.0</p>
      </div>
    </footer>
  );
};
