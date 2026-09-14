import { Link, useNavigate } from "react-router-dom";
import { GlossButton } from "@/components/ui-retro/GlossButton";
import { useAuth } from "@/context/AuthContext";
import logoHelmet from "@/assets/logo_helmet.jpeg";
import { Switch } from "@/components/ui/switch";

interface DashboardHeaderProps {
  rankBadge?: string | null;
  isAssistantVisible?: boolean;
  onToggleAssistant?: () => void;
}

export const DashboardHeader = ({
  rankBadge,
  isAssistantVisible = false,
  onToggleAssistant,
}: DashboardHeaderProps) => {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="relative z-20 border-b border-primary/30 bg-surface-inset/80 backdrop-blur">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="container flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-4">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-2 sm:gap-3">
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

        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[9px] uppercase tracking-wider text-primary/80 sm:text-[10px]">
              AI Coach
            </span>
            <Switch
              checked={isAssistantVisible}
              onCheckedChange={onToggleAssistant}
            />
          </div>
          <GlossButton size="sm" variant="ghost" onClick={handleLogout}>
            <span className="sm:hidden">Logout</span>
            <span className="hidden sm:inline">Change Account</span>
          </GlossButton>
        </div>
      </div>
    </header>
  );
};
