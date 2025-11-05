import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface ItemDetailsProps {
  itemId: string;
  itemData?: any; // Pass cached item data to avoid API call
  onClose: () => void;
}

interface ItemData {
  item_id: string;
  name: string;
  description: string;
  plaintext: string;
  tags: string[];
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
    attack_damage: number;
    ability_power: number;
    health: number;
    mana: number;
    armor: number;
    magic_resist: number;
    attack_speed: number;
    crit_chance: number;
    movement_speed: number;
    life_steal: number;
    ability_haste: number;
    health_regen: number;
    mana_regen: number;
  };
  recipe?: {
    components: Array<{
      id: string;
      name: string;
      cost: number;
    }>;
    builds_into: Array<{
      id: string;
      name: string;
      cost: number;
    }>;
    total_cost: number;
    base_cost: number;
    sell_value: number;
  };
  metadata?: {
    purchasable: boolean;
    consumable: boolean;
    boots: boolean;
    legendary: boolean;
    mythic: boolean;
    starter: boolean;
    support: boolean;
  };
}

export const ItemDetails: React.FC<ItemDetailsProps> = ({ itemId, itemData: cachedItemData, onClose }) => {
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
        setItemData({
          item_id: itemId,
          name: cachedItemData.name || 'Unknown Item',
          description: cachedItemData.description || '',
          plaintext: cachedItemData.plaintext || '',
          tags: cachedItemData.tags || [],
          gold: cachedItemData.gold || { base: 0, total: 0, sell: 0, purchasable: true },
          image: cachedItemData.image || { full: '', sprite: '', group: '', x: 0, y: 0, w: 0, h: 0 }
        });
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

  const getItemTypeColor = (tags: string[]): string => {
    if (tags.includes('Mythic')) return '#ff6b35';
    if (tags.includes('Legendary')) return '#ffd700';
    if (tags.includes('Epic')) return '#9d4edd';
    if (tags.includes('Boots')) return '#06ffa5';
    if (tags.includes('Consumable')) return '#ff9f1c';
    return '#5bc0de';
  };

  const getItemTypeLabel = (tags: string[]): string => {
    if (tags.includes('Mythic')) return 'Mythic';
    if (tags.includes('Legendary')) return 'Legendary';
    if (tags.includes('Epic')) return 'Epic';
    if (tags.includes('Boots')) return 'Boots';
    if (tags.includes('Consumable')) return 'Consumable';
    if (tags.includes('Starter')) return 'Starter';
    return 'Basic';
  };

  if (loading) {
    return (
      <div className="item-details-overlay" onClick={handleOverlayClick}>
        <div className="item-details-modal">
          <div className="item-details-loading">
            <div className="loading-spinner"></div>
            <p>Loading item details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="item-details-overlay" onClick={handleOverlayClick}>
        <div className="item-details-modal">
          <div className="item-details-error">
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
    <div className="item-details-overlay" onClick={handleOverlayClick}>
      <div className="item-details-modal">
        <div className="item-details-header">
          <div className="item-title-section">
            <div className="item-portrait">
              <img 
                src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/item/${itemData.image.full}`}
                alt={itemData.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/item-placeholder.png';
                }}
              />
            </div>
            <div className="item-title-info">
              <h2>{itemData.name}</h2>
              <p className="item-plaintext">{itemData.plaintext}</p>
              <div className="item-tags">
                {itemData.tags.map(tag => (
                  <span key={tag} className="item-tag" style={{ borderColor: getItemTypeColor(itemData.tags) }}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className="item-type">
                <span 
                  className="type-badge"
                  style={{ backgroundColor: getItemTypeColor(itemData.tags) }}
                >
                  {getItemTypeLabel(itemData.tags)}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="item-close-button">×</button>
        </div>

        <div className="item-details-content">
          {/* Item Cost Section */}
          <div className="item-cost-section">
            <h3>Cost Information</h3>
            <div className="cost-grid">
              <div className="cost-item">
                <span className="cost-label">Total Cost:</span>
                <span className="cost-value gold">{formatGoldValue(itemData.gold.total)}g</span>
              </div>
              <div className="cost-item">
                <span className="cost-label">Base Cost:</span>
                <span className="cost-value">{formatGoldValue(itemData.gold.base)}g</span>
              </div>
              <div className="cost-item">
                <span className="cost-label">Sell Value:</span>
                <span className="cost-value">{formatGoldValue(itemData.gold.sell)}g</span>
              </div>
              <div className="cost-item">
                <span className="cost-label">Purchasable:</span>
                <span className={`cost-value ${itemData.gold.purchasable ? 'purchasable' : 'not-purchasable'}`}>
                  {itemData.gold.purchasable ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Item Description */}
          <div className="item-description-section">
            <h3>Description</h3>
            <div className="item-description" dangerouslySetInnerHTML={{ __html: itemData.description }} />
          </div>

          {/* Item Stats Section */}
          {itemData.stats && (
            <div className="item-stats-section">
              <h3>Item Statistics</h3>
              <div className="stats-grid">
                {Object.entries(itemData.stats).map(([statKey, statValue]) => {
                  if (statValue === 0) return null;
                  
                  const statLabel = statKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  const isPercentage = statKey.includes('speed') || statKey.includes('crit') || statKey.includes('steal');
                  
                  return (
                    <div key={statKey} className="stat-item">
                      <span className="stat-label">{statLabel}:</span>
                      <span className="stat-value">
                        +{statValue}{isPercentage ? '%' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recipe Section */}
          {itemData.recipe && (
            <div className="item-recipe-section">
              <h3>Build Information</h3>
              
              {itemData.recipe.components.length > 0 && (
                <div className="recipe-subsection">
                  <h4>Components</h4>
                  <div className="recipe-items">
                    {itemData.recipe.components.map((component, index) => (
                      <div key={index} className="recipe-item">
                        <span className="recipe-item-name">{component.name}</span>
                        <span className="recipe-item-cost">{formatGoldValue(component.cost)}g</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {itemData.recipe.builds_into.length > 0 && (
                <div className="recipe-subsection">
                  <h4>Builds Into</h4>
                  <div className="recipe-items">
                    {itemData.recipe.builds_into.map((upgrade, index) => (
                      <div key={index} className="recipe-item">
                        <span className="recipe-item-name">{upgrade.name}</span>
                        <span className="recipe-item-cost">{formatGoldValue(upgrade.cost)}g</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Item Metadata */}
          {itemData.metadata && (
            <div className="item-metadata-section">
              <h3>Item Properties</h3>
              <div className="metadata-grid">
                {Object.entries(itemData.metadata).map(([key, value]) => {
                  if (!value) return null;
                  
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  
                  return (
                    <div key={key} className="metadata-item">
                      <span className="metadata-icon">✓</span>
                      <span className="metadata-label">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};