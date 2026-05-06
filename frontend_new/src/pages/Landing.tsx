import { useState, FormEvent, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { BevelPanel } from "@/components/ui-retro/BevelPanel";
import { GlossButton } from "@/components/ui-retro/GlossButton";
import { RuneDivider } from "@/components/ui-retro/RuneDivider";
import { REGIONS } from "@/config/api";
import { apiService } from "@/services/api";
import { storage } from "@/utils/storage";
import { useAuth } from "@/context/AuthContext";
import type { UserCredentials } from "@/types/user";
import logo from "@/assets/logo.png";

const Landing = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState<UserCredentials>({
    gameName: "",
    tagLine: "",
    region: "americas",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.gameName.trim()) throw new Error("Game name is required");
      if (!formData.tagLine.trim()) throw new Error("Tag line is required");

      const userData = await apiService.getRiotPuuid(formData);
      storage.saveUserCredentials(formData);
      storage.saveUserData(userData);
      login(userData.puuid);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Authentication failed:", err);
      if (err.status === 404) {
        setError("Player not found. Please check your Riot ID and region.");
      } else if (err.status === 429) {
        setError("Too many requests. Please wait a moment and try again.");
      } else {
        setError(err.message || "Failed to authenticate. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-20 animate-rune-spin"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, hsl(10 96% 70% / 0.6) 60deg, transparent 120deg, hsl(8 100% 60% / 0.5) 180deg, transparent 240deg, hsl(42 80% 60% / 0.4) 300deg, transparent 360deg)",
            maskImage:
              "radial-gradient(circle, transparent 35%, black 36%, black 60%, transparent 61%)",
            WebkitMaskImage:
              "radial-gradient(circle, transparent 35%, black 36%, black 60%, transparent 61%)",
          }}
        />
        <div className="container relative z-10 flex flex-col items-center text-center py-20 md:py-28">
          <span className="mt-4 font-pixel text-[10px] uppercase tracking-[0.4em] text-primary animate-flicker">
            ◆ Summoner's best Companion ◆
          </span>
          <h1 className="mt-3 font-blackletter text-5xl md:text-7xl lg:text-8xl text-ink text-shadow-deep leading-none">
            <span className="text-glow">Rewind your</span>{" "}
            <span className="bg-gradient-coral bg-clip-text text-transparent">Rift</span>
          </h1>
          <div className="mt-3 h-1 w-48 bg-gradient-to-r from-transparent via-secondary to-transparent shadow-halo" />
          <p className="mt-6 max-w-2xl font-display text-lg text-parchment/90 leading-relaxed">
            Your AI-Powered League of Legends Coach. Performance analysis, match insights,
            predictions and a champion codex, forged for ascension.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-12">
        <RuneDivider label="Coaching Arsenal" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {title: "Performance", body: "Champion mastery, summoner spells, runes by the numbers." },
            {title: "Match History", body: "Deep replays with team comp & timelines." },
            {title: "Predictions", body: "AI-powered outcomes & live winrates." },
            {title: "AI Coach", body: "Context-aware chat that knows your data." },
          ].map((f) => (
            <BevelPanel key={f.title} className="p-5 text-center">
              <h3 className="mt-2 font-blackletter text-xl text-ink text-glow">{f.title}</h3>
              <p className="mt-2 font-sans text-sm text-muted-foreground">{f.body}</p>
            </BevelPanel>
          ))}
        </div>
      </section>

      {/* AUTH FORM */}
      <section className="container pb-20">
        <RuneDivider label="Enter the Rift" />
        <div className="mx-auto max-w-xl">
          <BevelPanel className="p-8">
            <h2 className="font-blackletter text-3xl text-ink text-glow text-center">
              Get Started
            </h2>
            <p className="mt-2 text-center font-sans text-sm text-muted-foreground">
              Enter your Riot ID to unlock personalized coaching insights
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="gameName"
                  className="block font-pixel text-[10px] uppercase tracking-widest text-primary"
                >
                  Game Name
                </label>
                <input
                  id="gameName"
                  name="gameName"
                  type="text"
                  value={formData.gameName}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  placeholder="Your game name"
                  className="w-full bg-surface-inset border border-border px-4 py-3 text-ink font-display placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:shadow-inner-glow"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="tagLine"
                  className="block font-pixel text-[10px] uppercase tracking-widest text-primary"
                >
                  Tag Line
                </label>
                <input
                  id="tagLine"
                  name="tagLine"
                  type="text"
                  value={formData.tagLine}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  placeholder="e.g., NA1"
                  className="w-full bg-surface-inset border border-border px-4 py-3 text-ink font-display placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:shadow-inner-glow"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="region"
                  className="block font-pixel text-[10px] uppercase tracking-widest text-primary"
                >
                  Region
                </label>
                <select
                  id="region"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="w-full bg-surface-inset border border-border px-4 py-3 text-ink font-display focus:border-primary focus:outline-none focus:shadow-inner-glow"
                >
                  {Object.entries(REGIONS).map(([label, value]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="border border-destructive/60 bg-destructive/10 px-4 py-3 text-destructive font-sans text-sm">
                  {error}
                </div>
              )}

              <GlossButton
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full animate-pulse-glow"
              >
                {loading ? "Connecting…" : "Start Coaching"}
              </GlossButton>
            </form>

            <p className="mt-6 text-center font-pixel text-[8px] uppercase tracking-widest text-muted-foreground">
              Free · Secure · Riot API + Gemini API
            </p>
          </BevelPanel>
        </div>
      </section>
    </PageShell>
  );
};

export default Landing;
