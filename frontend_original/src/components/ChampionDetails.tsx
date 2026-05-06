import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

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
        <div className="champion-details-modal">
          <div className="champion-details-loading">
            <div className="loading-spinner"></div>
            <p>Loading {championName} details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="champion-details-overlay" onClick={handleOverlayClick}>
        <div className="champion-details-modal">
          <div className="champion-details-error">
            <h3>Error Loading Champion</h3>
            <p>{error}</p>
            <div className="error-actions">
              <button onClick={loadChampionDetails} className="retry-button">
                Retry
              </button>
              <button onClick={onClose} className="close-button">
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

  return (
    <div className="champion-details-overlay" onClick={handleOverlayClick}>
      <div className="champion-details-modal">
        <div className="champion-details-header">
          <div className="champion-title-section">
            <div className="champion-portrait">
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/${championData.champion_id}.png`}
                alt={championData.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/champion-placeholder.png';
                }}
              />
            </div>
            <div className="champion-title-info">
              <h2>{championData.name}</h2>
              <p className="champion-title">{championData.title}</p>
              <div className="champion-tags">
                {championData.tags.map(tag => (
                  <span key={tag} className="champion-tag">{tag}</span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="champion-close-button">×</button>
        </div>

        <div className="champion-details-content">
          {/* Champion Info Stats */}
          {championData.champion_info && (
            <div className="champion-info-section">
              <h3>Champion Info</h3>



              <div className="info-bars">
                <div className="info-bar">
                  <span className="info-label">Attack</span>
                  <div className="info-bar-container">
                    <div
                      className="info-bar-fill attack"
                      style={{ width: `${(championData.champion_info.attack / 10) * 100}%` }}
                    ></div>
                  </div>
                  <span className="info-value">{championData.champion_info.attack}/10</span>
                </div>
                <div className="info-bar">
                  <span className="info-label">Defense</span>
                  <div className="info-bar-container">
                    <div
                      className="info-bar-fill defense"
                      style={{ width: `${(championData.champion_info.defense / 10) * 100}%` }}
                    ></div>
                  </div>
                  <span className="info-value">{championData.champion_info.defense}/10</span>
                </div>
                <div className="info-bar">
                  <span className="info-label">Magic</span>
                  <div className="info-bar-container">
                    <div
                      className="info-bar-fill magic"
                      style={{ width: `${(championData.champion_info.magic / 10) * 100}%` }}
                    ></div>
                  </div>
                  <span className="info-value">{championData.champion_info.magic}/10</span>
                </div>
                <div className="info-bar">
                  <span className="info-label">Difficulty</span>
                  <div className="info-bar-container">
                    <div
                      className="info-bar-fill difficulty"
                      style={{ width: `${(championData.champion_info.difficulty / 10) * 100}%` }}
                    ></div>
                  </div>
                  <span className="info-value">{championData.champion_info.difficulty}/10</span>
                </div>
                {championData.partype && (
                  <div className="info-bar">
                    <span className="info-label">Resource Type</span>
                    <div className="info-bar-container">
                      <div className="info-bar-fill resource" style={{ width: '100%' }}></div>
                    </div>
                    <span className="info-value">{championData.partype}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Abilities Section */}
          {championData.abilities && (
            <div className="abilities-section">
              <h3>Abilities</h3>
              <div className="abilities-grid">
                {Object.entries(championData.abilities).map(([key, ability]) => (
                  <div key={key} className="ability-card">
                    <div className="ability-header">
                      <div className="ability-icon">
                        {ability.image?.full && (
                          <img
                            src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/spell/${ability.image.full}`}
                            alt={ability.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/ability-placeholder.png';
                            }}
                          />
                        )}
                        <span className="ability-key">{key.toUpperCase()}</span>
                      </div>
                      <div className="ability-info">
                        <h4>{ability.name}</h4>
                        {ability.cooldown && ability.cooldown.length > 0 && (
                          <div className="ability-stats">
                            <span className="cooldown">CD: {ability.cooldown.join('/')}</span>
                            {ability.cost && ability.cost.length > 0 && (
                              <span className="cost">
                                Cost: {ability.cost.join('/')} {ability.cost_type || 'Mana'}
                              </span>
                            )}
                            {ability.range && ability.range.length > 0 && (
                              <span className="range">Range: {ability.range.join('/')}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ability-description" dangerouslySetInnerHTML={{ __html: ability.description }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Base Stats Section */}
          {(championData.base_stats || championData.stats) && (
            <div className="base-stats-section">
              <h3>Base Stats</h3>
              <div className="stats-grid">
                <div className="stat-group">
                  <h4>Health & Mana</h4>
                  <div className="stat-item">
                    <span className="stat-label">Health:</span>
                    <span className="stat-value">
                      {formatStatValue(championData.base_stats?.hp || championData.stats?.hp || 0)}
                      (+{formatStatValue(championData.base_stats?.hp_per_level || championData.stats?.hpperlevel || 0)}/lvl)
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Mana:</span>
                    <span className="stat-value">
                      {formatStatValue(championData.base_stats?.mp || championData.stats?.mp || 0)}
                      (+{formatStatValue(championData.base_stats?.mp_per_level || championData.stats?.mpperlevel || 0)}/lvl)
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Health Regen:</span>
                    <span className="stat-value">
                      {formatStatValue(championData.base_stats?.hp_regen || championData.stats?.hpregen || 0)}
                      (+{formatStatValue(championData.base_stats?.hp_regen_per_level || championData.stats?.hpregenperlevel || 0)}/lvl)
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Mana Regen:</span>
                    <span className="stat-value">
                      {formatStatValue(championData.base_stats?.mp_regen || championData.stats?.mpregen || 0)}
                      (+{formatStatValue(championData.base_stats?.mp_regen_per_level || championData.stats?.mpregenperlevel || 0)}/lvl)
                    </span>
                  </div>
                </div>

                <div className="stat-group">
                  <h4>Combat</h4>
                  <div className="stat-item">
                    <span className="stat-label">Attack Damage:</span>
                    <span className="stat-value">
                      {formatStatValue(championData.base_stats?.attack_damage || championData.stats?.attackdamage || 0)}
                      (+{formatStatValue(championData.base_stats?.attack_damage_per_level || championData.stats?.attackdamageperlevel || 0)}/lvl)
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Attack Speed:</span>
                    <span className="stat-value">
                      {formatStatValue(championData.base_stats?.attack_speed || championData.stats?.attackspeed || 0)}
                      (+{formatStatValue(championData.base_stats?.attack_speed_per_level || championData.stats?.attackspeedperlevel || 0)}/lvl)
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Attack Range:</span>
                    <span className="stat-value">{formatStatValue(championData.base_stats?.attack_range || championData.stats?.attackrange || 0)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Critical Strike:</span>
                    <span className="stat-value">
                      {formatStatValue(championData.base_stats?.crit || championData.stats?.crit || 0)}
                      (+{formatStatValue(championData.base_stats?.crit_per_level || championData.stats?.critperlevel || 0)}/lvl)
                    </span>
                  </div>
                </div>

                <div className="stat-group">
                  <h4>Defense</h4>
                  <div className="stat-item">
                    <span className="stat-label">Armor:</span>
                    <span className="stat-value">
                      {formatStatValue(championData.base_stats?.armor || championData.stats?.armor || 0)}
                      (+{formatStatValue(championData.base_stats?.armor_per_level || championData.stats?.armorperlevel || 0)}/lvl)
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Magic Resist:</span>
                    <span className="stat-value">
                      {formatStatValue(championData.base_stats?.spell_block || championData.stats?.spellblock || 0)}
                      (+{formatStatValue(championData.base_stats?.spell_block_per_level || championData.stats?.spellblockperlevel || 0)}/lvl)
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Move Speed:</span>
                    <span className="stat-value">{formatStatValue(championData.base_stats?.move_speed || championData.stats?.movespeed || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tips and Lore Section */}
          {championData.tips && (
            <div className="tips-section">
              <h3>Tips & Lore</h3>

              {championData.tips.lore && (
                <div className="lore-section">
                  <h4>Lore</h4>
                  <p className="lore-text">{championData.tips.lore}</p>
                </div>
              )}

              {championData.tips.ally_tips.length > 0 && (
                <div className="tips-subsection">
                  <h4>Playing as {championData.name}</h4>
                  <ul className="tips-list">
                    {championData.tips.ally_tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {championData.tips.enemy_tips.length > 0 && (
                <div className="tips-subsection">
                  <h4>Playing against {championData.name}</h4>
                  <ul className="tips-list">
                    {championData.tips.enemy_tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};