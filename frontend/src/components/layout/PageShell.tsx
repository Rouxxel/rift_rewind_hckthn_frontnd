import { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

interface PageShellProps {
  children: ReactNode;
}

export const PageShell = ({ children }: PageShellProps) => {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* CRT scanline overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-scanlines opacity-[0.18] mix-blend-overlay" />
      {/* Vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-40"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, hsl(278 60% 4% / 0.7) 100%)",
        }}
      />
      <SiteHeader />
      <main className="relative z-10 flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
};
