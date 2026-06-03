import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import mapDataRaw from '../../data/map_data.csv?raw';

const parseCSV = (csvText: string) => {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const rowValues = [];
    let insideQuote = false;
    let currentVal = '';
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (j + 1 < line.length && line[j + 1] === '"') {
          currentVal += '"';
          j++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        rowValues.push(currentVal);
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    rowValues.push(currentVal);
    
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = rowValues[idx] || '';
    });
    result.push(obj);
  }
  return result;
};

const parsedMaps = parseCSV(mapDataRaw);
const MAP_NAMES: Record<string, string> = {};
parsedMaps.forEach(row => {
  if (row.id && row.map_name) {
    MAP_NAMES[row.id] = row.map_name;
  }
});

interface ItemDetailsProps {
  itemId: string;
  itemData?: any; // Pass cached item data to avoid API call
  allItemsData?: any; // Pass all items data for name resolution
  onClose: () => void;
}

interface ItemData {
  item_id?: string;
  name: string;
  description: string;
  plaintext: string;
  tags: string[];
  colloq?: string;
  gold: {
    base: number;
    total: number;
    sell: number;
    purchasable: boolean;
  };
  image: {
    full: string;
    sprite: string;
    group: string;
    x: number;
    y: number;
    w: number;
    h: number;
  };
  stats?: {
    FlatPhysicalDamageMod?: number;
    FlatMagicDamageMod?: number;
    FlatHPPoolMod?: number;
    FlatMPPoolMod?: number;
    FlatArmorMod?: number;
    FlatSpellBlockMod?: number;
    PercentAttackSpeedMod?: number;
    FlatCritChanceMod?: number;
    FlatMovementSpeedMod?: number;
    PercentLifeStealMod?: number;
    FlatHPRegenMod?: number;
    FlatMPRegenMod?: number;
    // Legacy field names for backward compatibility
    attack_damage?: number;
    ability_power?: number;
    health?: number;
    mana?: number;
    armor?: number;
    magic_resist?: number;
    attack_speed?: number;
    crit_chance?: number;
    movement_speed?: number;
    life_steal?: number;
    ability_haste?: number;
    health_regen?: number;
    mana_regen?: number;
  };
  into?: string[];
  from?: string[];
  maps?: { [key: string]: boolean };
  effect?: { [key: string]: string };
}

export const ItemDetails: React.FC<ItemDetailsProps> = ({ itemId, itemData: cachedItemData, allItemsData, onClose }) => {
  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItemDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // If we have cached item data, use it first for basic info
      if (cachedItemData) {
        console.log('📋 Using cached item data:', cachedItemData);
        setItemData(cachedItemData);
      } else {
        // Fallback to API call if no cached data
        console.log('🔄 Loading item details from API...');
        const response = await apiService.getItems(itemId);
        console.log('✅ Item details loaded:', response);
        setItemData(response.item);
      }
    } catch (err: any) {
      console.error('❌ Failed to load item details:', err);
      setError(err.message || 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItemDetails();
  }, [itemId]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatGoldValue = (value: number): string => {
    return value.toLocaleString();
  };

  const cleanDescription = (description: string): string => {
    if (!description) return '';

    // Remove extra whitespace and clean up HTML
    return description
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  };

  const getStatValue = (stats: any, statName: string): number => {
    if (!stats) return 0;

    // Check both new API format and legacy format
    const statMappings: { [key: string]: string[] } = {
      'attack_damage': ['FlatPhysicalDamageMod', 'attack_damage'],
      'ability_power': ['FlatMagicDamageMod', 'ability_power'],
      'health': ['FlatHPPoolMod', 'health'],
      'mana': ['FlatMPPoolMod', 'mana'],
      'armor': ['FlatArmorMod', 'armor'],
      'magic_resist': ['FlatSpellBlockMod', 'magic_resist'],
      'attack_speed': ['PercentAttackSpeedMod', 'attack_speed'],
      'crit_chance': ['FlatCritChanceMod', 'crit_chance'],
      'movement_speed': ['FlatMovementSpeedMod', 'movement_speed'],
      'life_steal': ['PercentLifeStealMod', 'life_steal'],
      'health_regen': ['FlatHPRegenMod', 'health_regen'],
      'mana_regen': ['FlatMPRegenMod', 'mana_regen']
    };

    const possibleKeys = statMappings[statName] || [statName];

    for (const key of possibleKeys) {
      if (stats[key] && stats[key] > 0) {
        return stats[key];
      }
    }

    return 0;
  };

  const getMapName = (mapId: string): string => {
    return MAP_NAMES[mapId] || `Unknown Map (${mapId})`;
  };

  const formatTag = (tag: string): string => {
    // Split camelCase and PascalCase words
    return tag
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      .trim();
  };

  const getItemName = (itemId: string, allItemsData?: any): string => {
    // First try to get from the passed allItemsData parameter
    if (allItemsData && allItemsData[itemId] && allItemsData[itemId].name) {
      return allItemsData[itemId].name;
    }

    // Try to get item name from cached data if available
    if (cachedItemData && typeof cachedItemData === 'object') {
      // Check if cachedItemData has items object (nested structure)
      if (cachedItemData.items && cachedItemData.items[itemId]) {
        return cachedItemData.items[itemId].name || itemId;
      }
      // Check if cachedItemData is the items object itself (flat structure)
      if (cachedItemData[itemId] && cachedItemData[itemId].name) {
        return cachedItemData[itemId].name;
      }
      // Check if there's a data property containing items
      if (cachedItemData.data && cachedItemData.data[itemId] && cachedItemData.data[itemId].name) {
        return cachedItemData.data[itemId].name;
      }
    }
    return itemId;
  };

  const hasOffensiveStats = (stats: any): boolean => {
    return getStatValue(stats, 'attack_damage') > 0 ||
      getStatValue(stats, 'ability_power') > 0 ||
      getStatValue(stats, 'attack_speed') > 0 ||
      getStatValue(stats, 'crit_chance') > 0 ||
      getStatValue(stats, 'life_steal') > 0;
  };

  const hasDefensiveStats = (stats: any): boolean => {
    return getStatValue(stats, 'health') > 0 ||
      getStatValue(stats, 'armor') > 0 ||
      getStatValue(stats, 'magic_resist') > 0 ||
      getStatValue(stats, 'health_regen') > 0;
  };

  const hasUtilityStats = (stats: any): boolean => {
    return getStatValue(stats, 'mana') > 0 ||
      getStatValue(stats, 'mana_regen') > 0 ||
      getStatValue(stats, 'movement_speed') > 0;
  };



  const overlayClasses = "fixed inset-0 z-[999] flex items-center justify-center p-6 backdrop-blur-md bg-[radial-gradient(ellipse_at_center,hsl(277_40%_22%/0.7),hsl(277_70%_4%/0.92))] animate-fade-in-up";
  const modalClasses = "relative w-full max-w-[1000px] max-h-[90vh] overflow-y-auto rounded-sm border-2 border-primary/80 bg-gradient-to-b from-[hsl(277_35%_22%)] to-[hsl(277_40%_14%)] shadow-[inset_0_1px_0_hsl(38_60%_90%/0.2),inset_0_-2px_0_hsl(277_50%_6%/0.6),0_18px_60px_hsl(277_80%_4%/0.7),0_0_60px_hsl(10_96%_70%/0.35)] animate-fade-in-up before:content-[''] before:absolute before:inset-[4px] before:border before:border-primary/20 before:rounded-[inherit] before:pointer-events-none";
  const closeBtnClasses = "flex-shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-sm border border-border bg-surface-inset text-ink/75 text-xl leading-none cursor-pointer transition-colors hover:text-secondary hover:border-secondary hover:bg-secondary/10";

  if (loading) {
    return (
      <div className={overlayClasses} onClick={handleOverlayClick}>
        <div className={`${modalClasses} flex items-center justify-center p-12`}>
          <div className="flex flex-col items-center gap-3">
            <span className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <p className="font-display text-sm text-ink/80">Loading item details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={overlayClasses} onClick={handleOverlayClick}>
        <div className={`${modalClasses} p-8`}>
          <div className="flex flex-col items-center gap-3 text-center">
            <h3 className="font-blackletter text-xl text-secondary m-0">Error Loading Item</h3>
            <p className="font-display text-sm text-ink/80 m-0">{error}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={loadItemDetails} className="px-4 py-2 rounded-sm border border-primary/70 bg-surface-inset text-primary font-display text-xs uppercase tracking-[0.18em] hover:bg-primary/10 transition-colors">
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

  if (!itemData) {
    return null;
  }

  const formattedTags = itemData.tags.map(formatTag);

  const StatRow = ({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) => (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-sm bg-surface-inset/50 border border-border/60">
      <span className="font-pixel text-[9px] uppercase tracking-[0.18em] text-ink/70">{label}</span>
      <span className="font-blackletter text-base text-primary text-glow">+{value}{suffix}</span>
    </div>
  );

  const StatGroup = ({ title, has, children }: { title: string; has: boolean; children: React.ReactNode }) => (
    <div className="flex flex-col gap-2">
      <h4 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/90 m-0 pb-1.5 border-b border-primary/30">
        ◆ {title}
      </h4>
      {has ? (
        <div className="flex flex-col gap-1.5">{children}</div>
      ) : (
        <div className="px-3 py-2 rounded-sm bg-surface-inset/30 border border-dashed border-border/50 text-center">
          <span className="font-display text-xs italic text-muted-foreground">Not Applicable</span>
        </div>
      )}
    </div>
  );

  return (
    <div className={overlayClasses} onClick={handleOverlayClick}>
      <div className={modalClasses}>
        <div className="sticky top-0 z-[5] flex items-start justify-between flex-wrap gap-4 px-6 py-5 backdrop-blur-sm bg-gradient-to-b from-[hsl(277_40%_18%)] to-[hsl(277_40%_12%)] border-b border-primary/35">
          <div className="flex flex-row items-center gap-4 min-w-0 flex-1">
            <div className="relative h-16 w-16 rounded-sm overflow-hidden border-2 border-primary/60 shadow-bevel flex-shrink-0">
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/item/${itemData.image.full}`}
                alt={itemData.name}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/item-placeholder.png';
                }}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <h2 className="m-0 truncate font-blackletter text-2xl leading-tight text-primary text-glow">
                {itemData.name}{' '}
                <span className="font-pixel text-[10px] uppercase tracking-[0.15em] text-muted-foreground align-middle">
                  Id: {itemId}
                </span>
              </h2>
              <p className="m-0 font-display italic text-sm text-ink/75">{itemData.plaintext}</p>
              {formattedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {formattedTags.map((tag) => (
                    <span 
                      key={tag} 
                      className="px-2 py-0.5 rounded-[2px] border border-primary/40 bg-primary/10 text-primary font-pixel text-[8px] uppercase tracking-[0.12em]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={closeBtnClasses} 
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-5 sm:p-6 flex flex-col gap-5">
          <section className="flex flex-col gap-4">
            <h3 className="font-blackletter text-lg text-primary text-glow m-0 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rotate-45 bg-primary shadow-halo" />
              Item Info
            </h3>

            {itemData.description && (
              <div className="panel-bevel rounded-sm p-4 text-sm leading-relaxed text-ink/90">
                <div dangerouslySetInnerHTML={{ __html: cleanDescription(itemData.description) }} />
              </div>
            )}

            <div className="panel-bevel rounded-sm overflow-hidden">
              <div className="grid grid-cols-2 px-4 py-2.5 bg-surface-inset/80 border-b border-border font-display text-[11px] uppercase tracking-[0.18em] text-primary">
                <span>Gold</span>
                <span className="text-right">Value</span>
              </div>
              {[
                ['Total Cost', `${formatGoldValue(itemData.gold.total)}g`],
                ['Base Cost', `${formatGoldValue(itemData.gold.base)}g`],
                ['Sell Value', `${formatGoldValue(itemData.gold.sell)}g`],
                ['Purchasable', itemData.gold.purchasable ? 'Yes' : 'No'],
              ].map(([label, value], i) => (
                <div
                  key={label as string}
                  className={[
                    "grid grid-cols-2 items-center px-4 py-2.5 border-b border-border/50 last:border-b-0",
                    i % 2 === 0 ? "bg-surface-inset/40" : "bg-transparent",
                  ].join(" ")}
                >
                  <span className="font-pixel text-[10px] uppercase tracking-[0.18em] text-ink/70">{label}</span>
                  <span className="text-right font-blackletter text-base text-gold text-glow-gold">{value}</span>
                </div>
              ))}
            </div>

            {itemData.maps && (
              <div className="panel-bevel rounded-sm p-4 flex flex-col gap-1.5">
                <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/90">◆ Available Maps</span>
                <span className="font-display text-sm text-ink/85">
                  {Object.entries(itemData.maps)
                    .filter(([_, available]) => available)
                    .map(([mapId]) => `${getMapName(mapId)} (${mapId})`)
                    .join(', ') || 'None'}
                </span>
              </div>
            )}

            {itemData.effect && Object.keys(itemData.effect).length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="font-blackletter text-base text-primary m-0">Special Effects (Riot's Internal Parameters)</h4>
                <p className="text-xs italic text-muted-foreground m-0 leading-relaxed">
                  <strong className="text-secondary not-italic">⚠ Item-Specific Values:</strong>{' '}
                  These are Riot's internal effect parameters for this specific item. Each Effect# slot has a
                  different meaning per item — there's no universal "Effect1 = damage" rule. The actual meaning
                  depends on this item's unique mechanics.
                </p>
                <div className="panel-bevel rounded-sm overflow-hidden">
                  <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 px-4 py-2.5 bg-surface-inset/80 border-b border-border font-display text-[11px] uppercase tracking-[0.18em] text-primary">
                    <div>Parameter</div>
                    <div>Raw Value</div>
                    <div>Estimated Type</div>
                  </div>
                  {Object.entries(itemData.effect)
                    .filter(([_, v]) => v !== '0' && parseFloat(v as string) !== 0)
                    .map(([key, value], index) => {
                      const numValue = parseFloat(value as string);
                      let estimatedType = 'Unknown';
                      if (numValue > 0 && numValue < 1) estimatedType = `Likely ${(numValue * 100).toFixed(1)}% (Percentage)`;
                      else if (numValue >= 1 && numValue <= 10) estimatedType = `Likely ${numValue} (Duration/Count)`;
                      else if (numValue > 10 && numValue <= 100) estimatedType = `Likely ${numValue} (Damage/Range)`;
                      else if (numValue > 100) estimatedType = `Likely ${numValue} (Large Threshold)`;
                      return (
                        <div
                          key={key}
                          className={[
                            "grid grid-cols-[1fr_1fr_2fr] gap-2 items-center px-4 py-2.5 border-b border-border/50 last:border-b-0",
                            index % 2 === 0 ? "bg-surface-inset/40" : "bg-transparent",
                          ].join(" ")}
                        >
                          <span className="font-pixel text-[10px] text-primary truncate">{key}</span>
                          <span className="font-blackletter text-base text-gold">{value as string}</span>
                          <span className="font-display text-xs text-ink/80">{estimatedType}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="font-blackletter text-lg text-primary text-glow m-0 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rotate-45 bg-primary shadow-halo" />
              Item Statistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatGroup title="Offensive" has={hasOffensiveStats(itemData.stats)}>
                {getStatValue(itemData.stats, 'attack_damage') > 0 && <StatRow label="Attack Damage" value={getStatValue(itemData.stats, 'attack_damage')} />}
                {getStatValue(itemData.stats, 'ability_power') > 0 && <StatRow label="Ability Power" value={getStatValue(itemData.stats, 'ability_power')} />}
                {getStatValue(itemData.stats, 'attack_speed') > 0 && <StatRow label="Attack Speed" value={getStatValue(itemData.stats, 'attack_speed')} suffix="%" />}
                {getStatValue(itemData.stats, 'crit_chance') > 0 && <StatRow label="Critical Strike" value={getStatValue(itemData.stats, 'crit_chance')} suffix="%" />}
                {getStatValue(itemData.stats, 'life_steal') > 0 && <StatRow label="Life Steal" value={getStatValue(itemData.stats, 'life_steal')} suffix="%" />}
              </StatGroup>
              <StatGroup title="Defensive" has={hasDefensiveStats(itemData.stats)}>
                {getStatValue(itemData.stats, 'health') > 0 && <StatRow label="Health" value={getStatValue(itemData.stats, 'health')} />}
                {getStatValue(itemData.stats, 'armor') > 0 && <StatRow label="Armor" value={getStatValue(itemData.stats, 'armor')} />}
                {getStatValue(itemData.stats, 'magic_resist') > 0 && <StatRow label="Magic Resist" value={getStatValue(itemData.stats, 'magic_resist')} />}
                {getStatValue(itemData.stats, 'health_regen') > 0 && <StatRow label="Health Regen" value={getStatValue(itemData.stats, 'health_regen')} />}
              </StatGroup>
              <StatGroup title="Utility" has={hasUtilityStats(itemData.stats)}>
                {getStatValue(itemData.stats, 'mana') > 0 && <StatRow label="Mana" value={getStatValue(itemData.stats, 'mana')} />}
                {getStatValue(itemData.stats, 'mana_regen') > 0 && <StatRow label="Mana Regen" value={getStatValue(itemData.stats, 'mana_regen')} />}
                {getStatValue(itemData.stats, 'movement_speed') > 0 && <StatRow label="Movement Speed" value={getStatValue(itemData.stats, 'movement_speed')} />}
              </StatGroup>
            </div>
          </section>

          {(itemData.from || itemData.into) && (
            <section className="flex flex-col gap-3">
              <h3 className="font-blackletter text-lg text-primary text-glow m-0 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rotate-45 bg-primary shadow-halo" />
                Build Information
              </h3>

              {itemData.from && itemData.from.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/90 m-0">◆ Components</h4>
                  <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
                    {itemData.from.map((componentId, index) => {
                      const itemName = getItemName(componentId, allItemsData);
                      return (
                        <div key={index} className="panel-bevel rounded-sm p-3 flex flex-col gap-1">
                          <div className="font-blackletter text-sm text-primary truncate">
                            {itemName !== componentId ? itemName : `Item ${componentId}`}
                          </div>
                          <div className="font-pixel text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                            ID: {componentId}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {itemData.into && itemData.into.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/90 m-0">◆ Builds Into:</h4>
                  <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
                    {itemData.into.map((upgradeId, index) => {
                      const itemName = getItemName(upgradeId, allItemsData);
                      return (
                        <div key={index} className="panel-bevel rounded-sm p-3 flex flex-col gap-1">
                          <div className="font-blackletter text-sm text-primary truncate">
                            {itemName !== upgradeId ? itemName : `Item ${upgradeId}`}
                          </div>
                          <div className="font-pixel text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                            ID: {upgradeId}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};