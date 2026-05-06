import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

interface ChampionDetailsProps {
  championName: string;
  championData?: any; // Pass cached champion data to avoid API call
  onClose: () => void;
}

interface ChampionAbility {
  name: string;
  description: string;
  tooltip?: string;
  cooldown?: number[];
  cost?: number[];
  cost_type?: string;
  range?: number[];
  max_rank?: number;
  image?: {
    full: string;
    sprite: string;
    group: string;
  };
}

interface ChampionData {
  champion_id: string;
  name: string;
  title: string;
  tags: string[];
  partype?: string;
  stats?: {
    hp: number;
    hpperlevel: number;
    mp: number;
    mpperlevel: number;
    movespeed: number;
    armor: number;
    armorperlevel: number;
    spellblock: number;
    spellblockperlevel: number;
    attackrange: number;
    hpregen: number;
    hpregenperlevel: number;
    mpregen: number;
    mpregenperlevel: number;
    crit: number;
    critperlevel: number;
    attackdamage: number;
    attackdamageperlevel: number;
    attackspeed: number;
    attackspeedperlevel: number;
  };
  abilities?: {
    passive: ChampionAbility;
    q: ChampionAbility;
    w: ChampionAbility;
    e: ChampionAbility;
    r: ChampionAbility;
  };
  base_stats?: {
    hp: number;
    hp_per_level: number;
    mp: number;
    mp_per_level: number;
    move_speed: number;
    armor: number;
    armor_per_level: number;
    spell_block: number;
    spell_block_per_level: number;
    attack_range: number;
    hp_regen: number;
    hp_regen_per_level: number;
    mp_regen: number;
    mp_regen_per_level: number;
    crit: number;
    crit_per_level: number;
    attack_damage: number;
    attack_damage_per_level: number;
    attack_speed: number;
    attack_speed_per_level: number;
  };
  tips?: {
    ally_tips: string[];
    enemy_tips: string[];
    lore: string;
    blurb: string;
  };
  champion_info?: {
    attack: number;
    defense: number;
    magic: number;
    difficulty: number;
  };
}

export const ChampionDetails: React.FC<ChampionDetailsProps> = ({ championName, championData: cachedChampionData, onClose }) => {
  const [championData, setChampionData] = useState<ChampionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChampionDetails();
  }, [championName]);

  const loadChampionDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // If we have cached champion data, use it first for basic info
      if (cachedChampionData) {
        console.log('📋 Using cached champion data:', cachedChampionData);
        // For now, just use the cached data - we can enhance this later
        // to call the detailed abilities endpoint if needed
        setChampionData({
          champion_id: cachedChampionData.id || cachedChampionData.key,
          name: cachedChampionData.name,
          title: cachedChampionData.title,
          tags: cachedChampionData.tags || [],
          partype: cachedChampionData.partype,
          stats: cachedChampionData.stats,
          // abilities will be undefined for cached data
          champion_info: cachedChampionData.info || {}
        });
      } else {
        // Fallback to API call if no cached data
        console.log('🔄 Loading champion details from API...');
        const response = await apiService.getChampionAbilities(championName, 'all', true, true);
        console.log('✅ Champion details loaded:', response);
        setChampionData(response);
      }
    } catch (err: any) {
      console.error('❌ Failed to load champion details:', err);
      setError(err.message || 'Failed to load champion details');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatStatValue = (value: number): string => {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  };





  if (loading) {
    return (
      <div className="champion-details-overlay" onClick={handleOverlayClick}>
        <div className="champion-details-modal flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <span className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <p className="font-display text-sm text-ink/80">Loading {championName} details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="champion-details-overlay" onClick={handleOverlayClick}>
        <div className="champion-details-modal p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <h3 className="font-blackletter text-xl text-secondary m-0">Error Loading Champion</h3>
            <p className="font-display text-sm text-ink/80 m-0">{error}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={loadChampionDetails} className="px-4 py-2 rounded-sm border border-primary/70 bg-surface-inset text-primary font-display text-xs uppercase tracking-[0.18em] hover:bg-primary/10 transition-colors">
                Retry
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-sm border border-border bg-surface-inset text-ink/80 font-display text-xs uppercase tracking-[0.18em] hover:text-secondary hover:border-secondary transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!championData) {
    return null;
  }

  const InfoBar = ({ label, value, max = 10, color, isText = false }: { label: string; value: number | string; max?: number; color: string; isText?: boolean }) => (
    <div className="grid grid-cols-[110px_1fr_70px] items-center gap-3">
      <span className="font-pixel text-[10px] uppercase tracking-[0.18em] text-ink/75">{label}</span>
      <div className="relative h-3 rounded-sm bg-surface-inset border border-border overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-sm shadow-[0_0_10px_currentColor]"
          style={{ width: isText ? '100%' : `${(Number(value) / max) * 100}%`, background: color, color }}
        />
      </div>
      <span className="font-blackletter text-sm text-primary text-right">
        {isText ? value : `${value}/${max}`}
      </span>
    </div>
  );

  const StatRow = ({ label, base, perLvl, suffix = '' }: { label: string; base: number; perLvl?: number; suffix?: string }) => (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-sm bg-surface-inset/50 border border-border/60">
      <span className="font-pixel text-[9px] uppercase tracking-[0.18em] text-ink/70">{label}</span>
      <span className="font-blackletter text-sm text-primary text-glow">
        {formatStatValue(base)}{suffix}
        {perLvl !== undefined && (
          <span className="text-xs text-muted-foreground ml-1 font-display">
            (+{formatStatValue(perLvl)}/lvl)
          </span>
        )}
      </span>
    </div>
  );

  const StatGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-2">
      <h4 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/90 m-0 pb-1.5 border-b border-primary/30">
        ◆ {title}
      </h4>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );

  const baseStats = championData.base_stats;
  const stats = championData.stats;
  const get = (a?: number, b?: number) => a ?? b ?? 0;

  return (
    <div className="champion-details-overlay" onClick={handleOverlayClick}>
      <div className="champion-details-modal">
        <div className="champion-details-header">
          <div className="champion-title-section">
            <div className="champion-portrait relative h-16 w-16 rounded-sm overflow-hidden border-2 border-primary/60 shadow-bevel flex-shrink-0">
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/${championData.champion_id}.png`}
                alt={championData.name}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/champion-placeholder.png';
                }}
              />
            </div>
            <div className="champion-title-info flex flex-col gap-1 min-w-0">
              <h2 className="m-0 truncate">{championData.name}</h2>
              <p className="champion-title m-0">{championData.title}</p>
              {championData.tags.length > 0 && (
                <div className="champion-tags">
                  {championData.tags.map((tag) => (
                    <span key={tag} className="champion-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="champion-close-button" aria-label="Close">×</button>
        </div>

        <div className="p-5 sm:p-6 flex flex-col gap-5">
          {/* Champion Info */}
          {championData.champion_info && (
            <section className="flex flex-col gap-3">
              <h3 className="font-blackletter text-lg text-primary text-glow m-0 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rotate-45 bg-primary shadow-halo" />
                Champion Info
              </h3>
              <div className="panel-bevel rounded-sm p-4 flex flex-col gap-2.5">
                <InfoBar label="Attack" value={championData.champion_info.attack ?? 0} color="hsl(8 100% 61%)" />
                <InfoBar label="Defense" value={championData.champion_info.defense ?? 0} color="hsl(210 90% 60%)" />
                <InfoBar label="Magic" value={championData.champion_info.magic ?? 0} color="hsl(280 80% 65%)" />
                <InfoBar label="Difficulty" value={championData.champion_info.difficulty ?? 0} color="hsl(42 80% 60%)" />
                {championData.partype && (
                  <InfoBar label="Resource" value={championData.partype} color="hsl(190 90% 55%)" isText />
                )}
              </div>
            </section>
          )}

          {/* Abilities */}
          {championData.abilities && (
            <section className="flex flex-col gap-3">
              <h3 className="font-blackletter text-lg text-primary text-glow m-0 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rotate-45 bg-primary shadow-halo" />
                Abilities
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(championData.abilities).map(([key, ability]) => (
                  <div key={key} className="panel-bevel rounded-sm p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="relative h-14 w-14 rounded-sm overflow-hidden border-2 border-primary/60 shadow-bevel flex-shrink-0">
                        {ability.image?.full && (
                          <img
                            src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/spell/${ability.image.full}`}
                            alt={ability.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/ability-placeholder.png';
                            }}
                          />
                        )}
                        <span className="absolute bottom-0 right-0 px-1 py-0.5 bg-background/85 text-primary font-pixel text-[8px] uppercase tracking-[0.1em] border-l border-t border-primary/60">
                          {key.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <h4 className="font-blackletter text-base text-primary text-glow m-0">{ability.name}</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {ability.cooldown && ability.cooldown.length > 0 && (
                            <span className="px-2 py-0.5 rounded-sm border border-border bg-surface-inset font-pixel text-[9px] uppercase tracking-[0.12em] text-ink/85">
                              CD: {ability.cooldown.join('/')}
                            </span>
                          )}
                          {ability.cost && ability.cost.length > 0 && (
                            <span className="px-2 py-0.5 rounded-sm border border-[hsl(190_90%_55%)]/50 bg-[hsl(190_90%_55%)]/10 font-pixel text-[9px] uppercase tracking-[0.12em] text-[hsl(190_90%_75%)]">
                              Cost: {ability.cost.join('/')} {ability.cost_type || 'Mana'}
                            </span>
                          )}
                          {ability.range && ability.range.length > 0 && (
                            <span className="px-2 py-0.5 rounded-sm border border-gold/50 bg-gold/10 font-pixel text-[9px] uppercase tracking-[0.12em] text-gold">
                              Range: {ability.range.join('/')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      className="text-sm text-ink/85 leading-relaxed pt-3 border-t border-border/60"
                      dangerouslySetInnerHTML={{ __html: ability.description }}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Base Stats */}
          {(baseStats || stats) && (
            <section className="flex flex-col gap-3">
              <h3 className="font-blackletter text-lg text-primary text-glow m-0 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rotate-45 bg-primary shadow-halo" />
                Base Stats
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatGroup title="Health & Mana">
                  <StatRow label="Health" base={get(baseStats?.hp, stats?.hp)} perLvl={get(baseStats?.hp_per_level, stats?.hpperlevel)} />
                  <StatRow label="Mana" base={get(baseStats?.mp, stats?.mp)} perLvl={get(baseStats?.mp_per_level, stats?.mpperlevel)} />
                  <StatRow label="HP Regen" base={get(baseStats?.hp_regen, stats?.hpregen)} perLvl={get(baseStats?.hp_regen_per_level, stats?.hpregenperlevel)} />
                  <StatRow label="MP Regen" base={get(baseStats?.mp_regen, stats?.mpregen)} perLvl={get(baseStats?.mp_regen_per_level, stats?.mpregenperlevel)} />
                </StatGroup>
                <StatGroup title="Combat">
                  <StatRow label="Attack Damage" base={get(baseStats?.attack_damage, stats?.attackdamage)} perLvl={get(baseStats?.attack_damage_per_level, stats?.attackdamageperlevel)} />
                  <StatRow label="Attack Speed" base={get(baseStats?.attack_speed, stats?.attackspeed)} perLvl={get(baseStats?.attack_speed_per_level, stats?.attackspeedperlevel)} />
                  <StatRow label="Attack Range" base={get(baseStats?.attack_range, stats?.attackrange)} />
                  <StatRow label="Critical" base={get(baseStats?.crit, stats?.crit)} perLvl={get(baseStats?.crit_per_level, stats?.critperlevel)} />
                </StatGroup>
                <StatGroup title="Defense">
                  <StatRow label="Armor" base={get(baseStats?.armor, stats?.armor)} perLvl={get(baseStats?.armor_per_level, stats?.armorperlevel)} />
                  <StatRow label="Magic Resist" base={get(baseStats?.spell_block, stats?.spellblock)} perLvl={get(baseStats?.spell_block_per_level, stats?.spellblockperlevel)} />
                  <StatRow label="Move Speed" base={get(baseStats?.move_speed, stats?.movespeed)} />
                </StatGroup>
              </div>
            </section>
          )}

          {/* Tips & Lore */}
          {championData.tips && (
            <section className="flex flex-col gap-3">
              <h3 className="font-blackletter text-lg text-primary text-glow m-0 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rotate-45 bg-primary shadow-halo" />
                Tips &amp; Lore
              </h3>

              {championData.tips.lore && (
                <div className="panel-bevel rounded-sm p-4 flex flex-col gap-2">
                  <h4 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/90 m-0">◆ Lore</h4>
                  <p className="text-sm italic leading-relaxed text-ink/85 m-0">{championData.tips.lore}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {championData.tips.ally_tips.length > 0 && (
                  <div className="panel-bevel rounded-sm p-4 flex flex-col gap-2">
                    <h4 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-[#6fd58a] m-0">◆ Playing as {championData.name}</h4>
                    <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
                      {championData.tips.ally_tips.map((tip, index) => (
                        <li key={index} className="text-sm text-ink/85 pl-4 relative before:content-['▸'] before:absolute before:left-0 before:text-[#6fd58a]">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {championData.tips.enemy_tips.length > 0 && (
                  <div className="panel-bevel rounded-sm p-4 flex flex-col gap-2">
                    <h4 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-secondary m-0">◆ Playing against {championData.name}</h4>
                    <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
                      {championData.tips.enemy_tips.map((tip, index) => (
                        <li key={index} className="text-sm text-ink/85 pl-4 relative before:content-['▸'] before:absolute before:left-0 before:text-secondary">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};