import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { storage } from '../../utils/storage';
import { ChampionDetails } from './ChampionDetails';
import { ItemDetails } from './ItemDetails';
import { cache, CACHE_KEYS } from '../../utils/cache';
import { getChampions } from '../../services/championCache';

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

  const loadChampions = async () => {
    if (championsLoaded) return; // Skip if already loaded in this session

    try {
      setLoading(true);
      setError(null);
      const championsData = await getChampions();
      setChampions(championsData);
      setChampionsLoaded(true);
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

  useEffect(() => {
    // Load both champions and items when component mounts (check cache first)
    loadChampions();
    loadItems();
  }, []);

  const filteredChampions = Object.entries(champions).filter(([_, champion]) =>
    champion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    champion.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredItems = Object.entries(items).filter(([_, item]) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.plaintext?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div>
        <div className="relative flex flex-wrap items-center gap-2 p-2 rounded-sm border border-border bg-gradient-panel shadow-bevel">
          <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          {([
            { id: 'champions', label: 'Champions' },
            { id: 'items', label: 'Items' },
          ] as const).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={[
                  "group relative inline-flex items-center gap-2 px-4 py-2 rounded-sm",
                  "font-display text-xs uppercase tracking-[0.18em]",
                  "border transition-all duration-200",
                  "before:absolute before:inset-0 before:rounded-[inherit] before:bg-sheen before:pointer-events-none before:opacity-60",
                  isActive
                    ? "bg-gradient-coral text-primary-foreground border-primary/80 shadow-halo"
                    : "bg-surface-inset/70 text-ink/75 border-border hover:text-primary hover:border-primary/60 hover:bg-surface-raised/60",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={[
                    "relative z-10 inline-block h-1.5 w-1.5 rotate-45",
                    isActive ? "bg-primary-foreground shadow-[0_0_6px_hsl(var(--primary-foreground)/0.8)]" : "bg-primary/70 group-hover:bg-primary",
                  ].join(" ")}
                />
                <span className="relative z-10 drop-shadow-[0_1px_0_hsl(277_50%_8%/0.6)]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-sm border-2 border-primary/70 bg-surface-inset shadow-[0_0_24px_hsl(10_96%_70%/0.35)] focus-within:border-primary focus-within:shadow-inner-glow">
        <span className="text-primary/80 font-display text-sm">⌕</span>
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent outline-none border-0 font-display text-sm text-ink placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Content */}
      <div>
        {loading && (
          <div className="flex flex-col items-center gap-3 py-12 text-ink/80">
            <span className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <p className="font-display text-sm">Loading {activeTab}...</p>
          </div>
        )}

        {error && (
          <div className="panel-bevel rounded-sm p-6 text-center flex flex-col items-center gap-3">
            <p className="font-display text-sm text-secondary">{error}</p>
            <button
              onClick={() => activeTab === 'champions' ? loadChampions() : loadItems()}
              className="px-4 py-2 rounded-sm border border-primary/70 bg-surface-inset text-primary font-display text-xs uppercase tracking-[0.18em] hover:bg-primary/10 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && activeTab === 'champions' && (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
            {filteredChampions.map(([id, champion]) => (
              <button
                key={id}
                onClick={() => {
                  setSelectedChampionForDetails(champion.name);
                  localStorage.setItem('rift_rewind_current_champion_name', champion.name);
                }}
                className="group relative panel-bevel rounded-sm p-3 flex flex-col items-center gap-2 text-center transition-all duration-200 hover:border-primary hover:shadow-halo hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="relative w-20 h-20 rounded-sm overflow-hidden border-2 border-primary/50 shadow-bevel">
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/${champion.image.full}`}
                    alt={champion.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/champion-placeholder.png';
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <h4 className="font-blackletter text-base text-primary text-glow m-0 truncate">{champion.name}</h4>
                  <p className="font-display text-[11px] italic text-ink/75 m-0 line-clamp-2 min-h-[2.4em]">{champion.title}</p>
                  <div className="flex flex-wrap justify-center gap-1 mt-1">
                    {champion.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded-sm border border-primary/40 bg-primary/10 text-primary font-pixel text-[8px] uppercase tracking-[0.12em]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && !error && activeTab === 'items' && (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
            {filteredItems.map(([id, item]) => (
              <button
                key={id}
                onClick={() => {
                  setSelectedItemForDetails(id);
                  localStorage.setItem('rift_rewind_current_item_id', id);
                }}
                className="group relative panel-bevel rounded-sm p-3 flex flex-col items-center gap-2 text-center transition-all duration-200 hover:border-primary hover:shadow-halo hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="relative w-16 h-16 rounded-sm overflow-hidden border-2 border-gold/60 shadow-bevel">
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/item/${item.image.full}`}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/item-placeholder.png';
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <h4 className="font-blackletter text-sm text-primary text-glow m-0 truncate">{item.name}</h4>
                  <p className="font-display text-[11px] italic text-ink/70 m-0 line-clamp-2 min-h-[2.4em]">{item.plaintext}</p>
                  <div className="mt-1 inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-sm border border-gold/50 bg-gold/10 text-gold font-pixel text-[9px] tracking-[0.1em] self-center">
                    <span>◈</span>
                    <span>{item.gold?.total || 0}g</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
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