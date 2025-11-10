import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { storage } from '../utils/storage';
import { ChampionDetails } from './ChampionDetails';
import { ItemDetails } from './ItemDetails';
import { cache, CACHE_KEYS } from '../utils/cache';

interface GameAssetsProps {
  onBack: () => void;
}

interface Champion {
  id: string;
  name: string;
  title: string;
  tags: string[];
  image: {
    full: string;
    sprite: string;
  };
}

interface Item {
  name: string;
  description: string;
  plaintext: string;
  image: {
    full: string;
    sprite: string;
  };
  gold: {
    base: number;
    total: number;
  };
}

export const GameAssets: React.FC<GameAssetsProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'champions' | 'items'>('champions');
  const [champions, setChampions] = useState<Record<string, Champion>>({});
  const [items, setItems] = useState<Record<string, Item>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChampionForDetails, setSelectedChampionForDetails] = useState<string | null>(null);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<string | null>(null);
  const [championsLoaded, setChampionsLoaded] = useState(false);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  // User data
  const userData = storage.getUserData();
  const userCredentials = storage.getUserCredentials();

  useEffect(() => {
    // Load both champions and items when component mounts (check cache first)
    loadChampions();
    loadItems();
  }, []);

  const loadChampions = async () => {
    if (championsLoaded) return; // Skip if already loaded in this session

    // Check persistent cache first
    const cachedChampions = cache.get<Record<string, Champion>>(CACHE_KEYS.CHAMPIONS);
    if (cachedChampions) {
      console.log('📋 Using cached champions data');
      setChampions(cachedChampions);
      setChampionsLoaded(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading champions from API...');
      const response = await apiService.getChampions();
      console.log('✅ Champions loaded:', response);
      
      const championsData = response.champions || {};
      setChampions(championsData);
      setChampionsLoaded(true);
      
      // Cache for 60 minutes
      cache.set(CACHE_KEYS.CHAMPIONS, championsData, 60);
    } catch (err: any) {
      console.error('❌ Failed to load champions:', err);
      setError(`Failed to load champions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    if (itemsLoaded) return; // Skip if already loaded in this session

    // Check persistent cache first
    const cachedItems = cache.get<Record<string, Item>>(CACHE_KEYS.ITEMS);
    if (cachedItems) {
      console.log('📋 Using cached items data');
      setItems(cachedItems);
      setItemsLoaded(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading items from API...');
      const response = await apiService.getItems();
      console.log('✅ Items loaded:', response);
      
      const itemsData = response.items || {};
      setItems(itemsData);
      setItemsLoaded(true);
      
      // Cache for 60 minutes
      cache.set(CACHE_KEYS.ITEMS, itemsData, 60);
    } catch (err: any) {
      console.error('❌ Failed to load items:', err);
      setError(`Failed to load items: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };



  const filteredChampions = Object.entries(champions).filter(([_, champion]) =>
    champion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    champion.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredItems = Object.entries(items).filter(([_, item]) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.plaintext?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="game-assets-page">
      <div className="game-assets-header">
        <div className="header-content">
          <button onClick={onBack} className="back-button">
            Back to Dashboard
          </button>
          <div className="header-center">
            <h2>🎮 Game Assets Explorer</h2>
            <p>{userData?.gameName}#{userData?.tagLine}</p>
          </div>
          <div className="header-spacer"></div>
        </div>
      </div>

      <div className="game-assets-tabs">
        <div className="game-assets-tabs-container">
          <button
            className={`tab-button ${activeTab === 'champions' ? 'active' : ''}`}
            onClick={() => setActiveTab('champions')}
          >
            Champions
          </button>
          <button
            className={`tab-button ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Items
          </button>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-bar-container">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="game-assets-content">
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading {activeTab}...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => activeTab === 'champions' ? loadChampions() : loadItems()}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'champions' && (
              <div className="champions-grid">
                {filteredChampions.map(([id, champion]) => (
                  <div key={id} className="champion-card" onClick={() => setSelectedChampionForDetails(champion.name)}>
                    <div className="champion-image">
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/${champion.image.full}`}
                        alt={champion.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/champion-placeholder.png';
                        }}
                      />
                    </div>
                    <div className="champion-info">
                      <h4>{champion.name}</h4>
                      <p>{champion.title}</p>
                      <div className="champion-tags">
                        {champion.tags.map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'items' && (
              <div className="items-grid">
                {filteredItems.map(([id, item]) => (
                  <div key={id} className="item-card" onClick={() => setSelectedItemForDetails(id)}>
                    <div className="item-image">
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/item/${item.image.full}`}
                        alt={item.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/item-placeholder.png';
                        }}
                      />
                    </div>
                    <div className="item-info">
                      <h4>{item.name}</h4>
                      <p>{item.plaintext}</p>
                      <div className="item-cost">
                        <span className="gold">💰 {item.gold?.total || 0}g</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}


          </>
        )}
      </div>

      {selectedChampionForDetails && (
        <ChampionDetails
          championName={selectedChampionForDetails}
          championData={Object.values(champions).find(champ => champ.name === selectedChampionForDetails)}
          onClose={() => setSelectedChampionForDetails(null)}
        />
      )}

      {selectedItemForDetails && (
        <ItemDetails
          itemId={selectedItemForDetails}
          itemData={items[selectedItemForDetails]}
          allItemsData={items}
          onClose={() => setSelectedItemForDetails(null)}
        />
      )}
    </div>
  );
};