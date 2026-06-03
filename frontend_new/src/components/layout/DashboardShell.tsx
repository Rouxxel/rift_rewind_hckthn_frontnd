import { ReactNode, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { DashboardHeader } from "./DashboardHeader";
import { SiteFooter } from "./SiteFooter";
import { AIAssistant } from "@/components/AIAssistant";


type Page = "dashboard" | "match-history" | "performance" | "predictions" | "game-assets";

const ROUTE_TO_PAGE: Record<string, Page> = {
  "/dashboard": "dashboard",
  "/dashboard/performance": "performance",
  "/dashboard/matches": "match-history",
  "/dashboard/predictions": "predictions",
  "/dashboard/assets": "game-assets",
};

interface DashboardShellProps {
  children: ReactNode;
  rankBadge?: string | null;
  showBack?: boolean;
}

export const DashboardShell = ({ children, rankBadge, showBack }: DashboardShellProps) => {
  const location = useLocation();
  const page: Page = ROUTE_TO_PAGE[location.pathname] ?? "dashboard";
  const [isAssistantVisible, setIsAssistantVisible] = useState(false);

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="pointer-events-none fixed inset-0 z-50 bg-scanlines opacity-[0.18] mix-blend-overlay" />
      <div
        className="pointer-events-none fixed inset-0 z-40"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, hsl(278 60% 4% / 0.7) 100%)",
        }}
      />
      <DashboardHeader 
        rankBadge={rankBadge} 
        isAssistantVisible={isAssistantVisible}
        onToggleAssistant={() => setIsAssistantVisible(!isAssistantVisible)}
      />
      {showBack && (
        <div className="container pt-4">
          <Link
            to="/dashboard"
            className="font-pixel text-[10px] uppercase tracking-widest text-primary hover:text-primary-glow"
          >
            ◀ Back to Dashboard
          </Link>
        </div>
      )}
      <main className="relative z-10 flex-1">{children}</main>
      <SiteFooter />
      {isAssistantVisible && <AIAssistant currentPage={page} />}
    </div>
  );
};
