import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

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

  useEffect(() => {
    loadItemDetails();
  }, [itemId]);

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
    const mapNames: { [key: string]: string } = {
      '3': 'Proving Grounds',
      '8': 'Crystal Scar',
      '10': 'Twisted Treeline',
      '11': 'Summoner\'s Rift',
      '12': 'Howling Abyss',
      '13': 'Magma Chamber',
      '14': 'Butcher\'s Bridge',
      '16': 'Cosmic Ruins',
      '18': 'Valoran City Park',
      '19': 'Substructure 43',
      '20': 'Crash Site',
      '21': 'Temple of Lily and Lotus',
      '22': 'Nexus Blitz',
      '30': 'Arena: Rings of Wrath',
      '35': 'The Bandlewood'
    };

    return mapNames[mapId] || `Unknown Map (${mapId})`;
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



  if (loading) {
    return (
      <div className="champion-details-overlay" onClick={handleOverlayClick}>
        <div className="champion-details-modal">
          <div className="champion-details-loading">
            <div className="loading-spinner"></div>
            <p>Loading item details...</p>
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
            <h3>Error Loading Item</h3>
            <p>{error}</p>
            <div className="error-actions">
              <button onClick={loadItemDetails} className="retry-button">
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

  if (!itemData) {
    return null;
  }

  return (
    <div className="champion-details-overlay" onClick={handleOverlayClick}>
      <div className="champion-details-modal">
        <div className="champion-details-header">
          <div className="champion-title-section">
            <div className="champion-portrait">
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/item/${itemData.image.full}`}
                alt={itemData.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/item-placeholder.png';
                }}
              />
            </div>
            <div className="champion-title-info">
              <h2>{itemData.name} <span className="item-id">(Id: {itemId})</span></h2>
              <p className="champion-title">{itemData.plaintext}</p>
              {/* Tags right below plaintext */}
              <div className="champion-tags">
                {itemData.tags.map(tag => (
                  <span key={tag} className="champion-tag">
                    {formatTag(tag)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="champion-close-button">×</button>
        </div>

        <div className="champion-details-content">
          {/* Item Info Section */}
          <div className="champion-info-section">
            <h3>Item Info</h3>

            {/* Item Description - First with proper spacing */}
            {itemData.description && (
              <div className="item-description-container">
                <div
                  className="item-description-content"
                  dangerouslySetInnerHTML={{ __html: cleanDescription(itemData.description) }}
                />
              </div>
            )}

            {/* Gold Information Table */}
            <div className="item-gold-table">
              <div className="gold-row">
                <span className="gold-label">Total Cost:</span>
                <span className="gold-value">{formatGoldValue(itemData.gold.total)}g</span>
              </div>
              <div className="gold-row">
                <span className="gold-label">Base Cost:</span>
                <span className="gold-value">{formatGoldValue(itemData.gold.base)}g</span>
              </div>
              <div className="gold-row">
                <span className="gold-label">Sell Value:</span>
                <span className="gold-value">{formatGoldValue(itemData.gold.sell)}g</span>
              </div>
              <div className="gold-row">
                <span className="gold-label">Purchasable:</span>
                <span className="gold-value">{itemData.gold.purchasable ? 'Yes' : 'No'}</span>
              </div>
            </div>

            {/* Additional Item Properties */}
            {itemData.maps && (
              <div className="additional-info">
                <div className="info-item">
                  <span className="info-label">Available Maps:</span>
                  <span className="info-value">
                    {Object.entries(itemData.maps)
                      .filter(([_, available]) => available)
                      .map(([mapId, _]) => `${getMapName(mapId)} (${mapId})`)
                      .join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* Special Effects Table */}
            {itemData.effect && Object.keys(itemData.effect).length > 0 && (
              <div className="special-effects-section">
                <h4>Special Effects (Riot's Internal Parameters)</h4>
                <p className="effects-explanation">
                  <strong>⚠️ Item-Specific Values:</strong> These are Riot's internal effect parameters for this specific item.
                  Each Effect# slot has a different meaning per item - there's no universal "Effect1 = damage" rule.
                  These values are used in item tooltips with placeholders like {`{{ e1 }}`}, {`{{ e2 }}`}, etc.
                  The actual meaning depends on this item's unique mechanics and tooltip implementation.
                </p>
                <div className="effects-table">
                  <div className="effects-table-header">
                    <div className="effect-cell header">Parameter</div>
                    <div className="effect-cell header">Raw Value</div>
                    <div className="effect-cell header">Estimated Type</div>
                  </div>
                  {Object.entries(itemData.effect)
                    .filter(([_, value]) => value !== '0' && parseFloat(value as string) !== 0)
                    .map(([key, value], index) => {
                      const numValue = parseFloat(value as string);
                      let estimatedType = 'Unknown';

                      if (numValue > 0 && numValue < 1) {
                        estimatedType = `Likely ${(numValue * 100).toFixed(1)}% (Percentage)`;
                      } else if (numValue >= 1 && numValue <= 10) {
                        estimatedType = `Likely ${numValue} (Duration/Count)`;
                      } else if (numValue > 10 && numValue <= 100) {
                        estimatedType = `Likely ${numValue} (Damage/Range)`;
                      } else if (numValue > 100) {
                        estimatedType = `Likely ${numValue} (Large Threshold)`;
                      }

                      return (
                        <div key={key} className={`effects-table-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                          <div className="effect-cell">
                            <span className="effect-param">{key}</span>
                          </div>
                          <div className="effect-cell value">{value}</div>
                          <div className="effect-cell meaning">{estimatedType}</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Item Stats Section */}
          <div className="base-stats-section">
            <h3>Item Statistics</h3>
            <div className="stats-grid">
              <div className="stat-group">
                <h4>Offensive Stats</h4>
                {hasOffensiveStats(itemData.stats) ? (
                  <>
                    {getStatValue(itemData.stats, 'attack_damage') > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Attack Damage:</span>
                        <span className="stat-value">+{getStatValue(itemData.stats, 'attack_damage')}</span>
                      </div>
                    )}
                    {getStatValue(itemData.stats, 'ability_power') > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Ability Power:</span>
                        <span className="stat-value">+{getStatValue(itemData.stats, 'ability_power')}</span>
                      </div>
                    )}
                    {getStatValue(itemData.stats, 'attack_speed') > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Attack Speed:</span>
                        <span className="stat-value">+{getStatValue(itemData.stats, 'attack_speed')}%</span>
                      </div>
                    )}
                    {getStatValue(itemData.stats, 'crit_chance') > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Critical Strike:</span>
                        <span className="stat-value">+{getStatValue(itemData.stats, 'crit_chance')}%</span>
                      </div>
                    )}
                    {getStatValue(itemData.stats, 'life_steal') > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Life Steal:</span>
                        <span className="stat-value">+{getStatValue(itemData.stats, 'life_steal')}%</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="stat-not-applicable">
                    <span>Not Applicable</span>
                  </div>
                )}
              </div>

              <div className="stat-group">
                <h4>Defensive Stats</h4>
                {hasDefensiveStats(itemData.stats) ? (
                  <>
                    {getStatValue(itemData.stats, 'health') > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Health:</span>
                        <span className="stat-value">+{getStatValue(itemData.stats, 'health')}</span>
                      </div>
                    )}
                    {getStatValue(itemData.stats, 'armor') > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Armor:</span>
                        <span className="stat-value">+{getStatValue(itemData.stats, 'armor')}</span>
                      </div>
                    )}
                    {getStatValue(itemData.stats, 'magic_resist') > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Magic Resist:</span>
                        <span className="stat-value">+{getStatValue(itemData.stats, 'magic_resist')}</span>
                      </div>
                    )}
                    {getStatValue(itemData.stats, 'health_regen') > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Health Regen:</span>
                        <span className="stat-value">+{getStatValue(itemData.stats, 'health_regen')}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="stat-not-applicable">
                    <span>Not Applicable</span>
                  </div>
                )}
              </div>

              <div className="stat-group">
                <h4>Utility Stats</h4>
                {hasUtilityStats(itemData.stats) ? (
                  <>
                    {getStatValue(itemData.stats, 'mana') > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Mana:</span>
                        <span className="stat-value">+{getStatValue(itemData.stats, 'mana')}</span>
                      </div>
                    )}
                    {getStatValue(itemData.stats, 'mana_regen') > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Mana Regen:</span>
                        <span className="stat-value">+{getStatValue(itemData.stats, 'mana_regen')}</span>
                      </div>
                    )}
                    {getStatValue(itemData.stats, 'movement_speed') > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Movement Speed:</span>
                        <span className="stat-value">+{getStatValue(itemData.stats, 'movement_speed')}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="stat-not-applicable">
                    <span>Not Applicable</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Build Information Section */}
          {(itemData.from || itemData.into) && (
            <div className="base-stats-section">
              <h3>Build Information</h3>

              {itemData.from && itemData.from.length > 0 && (
                <div className="build-subsection">
                  <h4>Components</h4>
                  <div className="build-items-grid">
                    {itemData.from.map((componentId, index) => {
                      const itemName = getItemName(componentId, allItemsData);
                      return (
                        <div key={index} className="build-item-card">
                          <div className="build-item-name">{itemName !== componentId ? itemName : `Item ${componentId}`}</div>
                          <div className="build-item-id">ID: {componentId}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {itemData.into && itemData.into.length > 0 && (
                <div className="build-subsection">
                  <h4>Builds Into</h4>
                  <div className="build-items-grid">
                    {itemData.into.map((upgradeId, index) => {
                      const itemName = getItemName(upgradeId, allItemsData);
                      return (
                        <div key={index} className="build-item-card">
                          <div className="build-item-name">{itemName !== upgradeId ? itemName : `Item ${upgradeId}`}</div>
                          <div className="build-item-id">ID: {upgradeId}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};