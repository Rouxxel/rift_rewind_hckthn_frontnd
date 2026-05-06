import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BevelPanel } from "@/components/ui-retro/BevelPanel";
import { GlossButton } from "@/components/ui-retro/GlossButton";
import { RuneDivider } from "@/components/ui-retro/RuneDivider";
import { useAuth } from "@/context/AuthContext";
import { apiService } from "@/services/api";

const TILES = [
  {
    title: "Performance Analysis",
    body: "Analyze the champion mastery, used summoner spells, utilized runes, all by the numbers.",
    to: "/dashboard/performance",
    cta: "View Performance",
  },
  {
    title: "Match History",
    body: "Take a deep dive into your recent games with composition, timelines, team actions and statistics.",
    to: "/dashboard/matches",
    cta: "View Matches",
  },
  {
    title: "Predictions",
    body: "Riot API-powered match outcome predictions & live champion winrates with AI analysis of synergies.",
    to: "/dashboard/predictions",
    cta: "View Predictions",
  },
  {
    title: "Game Assets",
    body: "Browse the champion roster & item compendium for a better understanding of the game, mechanics and strategies.",
    to: "/dashboard/assets",
    cta: "Explore Assets",
  },
];

const Dashboard = () => {
  const { puuid, credentials, userData } = useAuth();
  const [summonerInfo, setSummonerInfo] = useState<any>(null);
  const [rankedStats, setRankedStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserData = useCallback(async () => {
    if (!puuid || !credentials) return;
    setLoading(true);
    setError(null);

    try {
      const summoner = await apiService.getSummonerInfo(puuid, credentials.region);
      setSummonerInfo(summoner);
    } catch (err: any) {
      console.warn("Could not fetch summoner info:", err.message);
    }

    try {
      const ranked = await apiService.getRankedStats(puuid, credentials.region);
      setRankedStats(Array.isArray(ranked) ? ranked : []);
    } catch (err: any) {
      console.warn("Could not fetch ranked stats:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [puuid, credentials]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const topRank = rankedStats[0];
  const rankBadge = topRank
    ? `${topRank.tier} ${topRank.rank} · ${topRank.leaguePoints} LP`
    : null;

  return (
    <DashboardShell rankBadge={rankBadge}>
      <section className="container py-10">
        <div className="text-center">
          <span className="font-pixel text-[10px] uppercase tracking-[0.4em] text-primary animate-flicker">
            ◆ Welcome Back, Summoner ◆
          </span>
          <h1 className="mt-3 font-blackletter text-4xl md:text-6xl text-ink text-shadow-deep">
            <span className="text-glow">{userData?.gameName}</span>
            <span className="text-muted-foreground">#{userData?.tagLine}</span>
          </h1>
          <div className="mx-auto mt-3 h-1 w-48 bg-gradient-to-r from-transparent via-secondary to-transparent shadow-halo" />
        </div>

        {!loading && !summonerInfo && rankedStats.length === 0 && (
          <BevelPanel className="mx-auto mt-8 max-w-2xl p-6">
            <h3 className="font-blackletter text-2xl text-ink text-glow">
              ⚠ Connection Issue
            </h3>
            <p className="mt-2 font-sans text-sm text-muted-foreground">
              We couldn't fetch your data. The backend may be cold-starting (~30s),
              there's a network issue, or your Riot ID/region may be incorrect.
            </p>
            <ul className="mt-3 list-disc pl-5 font-sans text-sm text-muted-foreground">
              <li>Backend is starting up (cold start - wait ~30 seconds)</li>
              <li>Network connectivity issue</li>
              <li>Incorrect Riot ID or region</li>
            </ul>
            <div className="mt-4 font-sans text-sm text-ink/80">
              <p>
                <strong className="text-primary">Account:</strong> {userData?.gameName}#{userData?.tagLine}
              </p>
              <p>
                <strong className="text-primary">Region:</strong> {credentials?.region}
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <GlossButton variant="primary" onClick={loadUserData} disabled={loading}>
                {loading ? "Retrying…" : "Retry Connection"}
              </GlossButton>
            </div>
            {error && (
              <p className="mt-3 font-pixel text-[9px] uppercase tracking-widest text-destructive">
                {error}
              </p>
            )}
          </BevelPanel>
        )}
      </section>

      <section className="container pb-12">
        <RuneDivider label="Coaching Sections" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {TILES.map((t) => (
            <BevelPanel key={t.to}> 
              <div className="flex flex-col h-full min-h-[300px] p-6 text-center">
                <h3 className="mt-3 font-blackletter text-2xl text-ink text-glow">
                  {t.title}
                </h3>
                
                <p className="mt-2 font-sans text-sm text-muted-foreground flex-1 flex items-center justify-center">
                  {t.body}
                </p>
                
                <Link to={t.to} className="mt-4">
                  <GlossButton variant="primary" className="w-full">
                    {t.cta}
                  </GlossButton>
                </Link>
              </div>
            </BevelPanel>
          ))}
        </div>
      </section>

      {rankedStats.length > 0 && (
        <section className="container pb-16">
          <RuneDivider label="Ranked Overview" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rankedStats.map((q: any, idx: number) => {
              const total = q.wins + q.losses;
              const wr = total ? Math.round((q.wins / total) * 100) : 0;
              return (
                <BevelPanel key={idx} className="p-5">
                  <h4 className="font-pixel text-[10px] uppercase tracking-widest text-primary">
                    {q.queueType?.replace(/_/g, " ")}
                  </h4>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="font-blackletter text-2xl text-ink text-glow-gold">
                      {q.tier} {q.rank}
                    </span>
                    <span className="font-pixel text-xs text-gold">{q.leaguePoints} LP</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 font-display text-sm">
                    <span className="text-emerald-400">{q.wins}W</span>
                    <span className="text-destructive">{q.losses}L</span>
                    <span className="ml-auto font-pixel text-xs text-primary">{wr}%</span>
                  </div>
                </BevelPanel>
              );
            })}
          </div>
        </section>
      )}
    </DashboardShell>
  );
};

export default Dashboard;
