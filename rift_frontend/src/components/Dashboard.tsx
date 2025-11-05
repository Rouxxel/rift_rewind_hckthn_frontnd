import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { apiService } from '../services/api';
import { GameAssets } from './GameAssets';
import { Predictions } from './Predictions';
import type { RiotUser } from '../types/user';

interface DashboardProps {
  puuid: string;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ puuid, onLogout }) => {
  const [userData, setUserData] = useState<RiotUser | null>(null);
  const [summonerInfo, setSummonerInfo] = useState<any>(null);
  const [rankedStats, setRankedStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGameAssets, setShowGameAssets] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);

  useEffect(() => {
    loadUserData();
  }, [puuid]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get stored user data
      const storedUserData = storage.getUserData();
      const storedCredentials = storage.getUserCredentials();

      if (!storedUserData || !storedCredentials) {
        throw new Error('User data not found');
      }

      setUserData(storedUserData);

      // Try to fetch additional data from API (handle CORS gracefully)
      try {
        const summonerData = await apiService.getSummonerInfo(puuid, storedCredentials.region);
        setSummonerInfo(summonerData);
      } catch (summonerErr: any) {
        console.warn('Could not fetch summoner info:', summonerErr.message);
      }

      try {
        const rankedData = await apiService.getRankedStats(puuid, storedCredentials.region);
        setRankedStats(rankedData);
      } catch (rankedErr: any) {
        console.warn('Could not fetch ranked stats:', rankedErr.message);
      }

    } catch (err: any) {
      console.error('Failed to load user data:', err);
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    storage.clearUserData();
    onLogout();
  };

  // If showing Game Assets, render that instead of the dashboard
  if (showGameAssets) {
    return <GameAssets onBack={() => setShowGameAssets(false)} />;
  }

  // If showing Predictions, render that instead of the dashboard
  if (showPredictions) {
    return <Predictions onBack={() => setShowPredictions(false)} />;
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your coaching data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
        <button onClick={loadUserData} className="retry-button">
          Retry
        </button>
        <button onClick={handleLogout} className="logout-button">
          Change Account
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="user-info">
          <h1>Welcome, {userData?.gameName} #{userData?.tagLine}</h1>
          {summonerInfo && (
            <div className="summoner-details">
              {rankedStats && rankedStats.length > 0 && (
                <span className="rank">
                  {rankedStats[0].tier} {rankedStats[0].rank} ({rankedStats[0].leaguePoints} LP)
                </span>
              )}
            </div>
          )}
        </div>
        <button onClick={handleLogout} className="logout-button">
          Change Account
        </button>
      </header>

      <div className="dashboard-content">
        {!summonerInfo && !rankedStats && (
          <div className="cors-notice">
            <h3>⚠️ Limited Data Available</h3>
            <p>
              Some features are currently limited due to CORS restrictions.
              Your account ({userData?.gameName}#{userData?.tagLine}) is authenticated,
              but additional stats require backend CORS configuration.
            </p>
            <p>
              <strong>PUUID:</strong> {userData?.puuid}
            </p>
          </div>
        )}

        <div className="coaching-sections">
          <div className="section-card">
            <h3>🎯 Performance Analysis</h3>
            <p>Analyze your recent matches and identify improvement areas</p>
            <button className="section-button" disabled>
              Coming Soon
            </button>
          </div>

          <div className="section-card">
            <h3>🏆 Champion Mastery</h3>
            <p>Review your champion performance and get recommendations</p>
            <button className="section-button" disabled>
              Coming Soon
            </button>
          </div>

          <div className="section-card">
            <h3>📊 Match History</h3>
            <p>Deep dive into your recent games with detailed insights</p>
            <button className="section-button" disabled>
              Coming Soon
            </button>
          </div>

          <div className="section-card">
            <h3>🔮 Predictions</h3>
            <p>Get AI-powered predictions for your next matches and view champion winrates</p>
            <button 
              className="section-button"
              onClick={() => setShowPredictions(true)}
            >
              View Predictions
            </button>
          </div>

          <div className="section-card">
            <h3>🎮 Game Assets</h3>
            <p>Explore champions and items from League of Legends</p>
            <button 
              className="section-button"
              onClick={() => setShowGameAssets(true)}
            >
              Explore Assets
            </button>
          </div>
        </div>

        {rankedStats && rankedStats.length > 0 && (
          <div className="ranked-overview">
            <h3>Ranked Overview</h3>
            <div className="ranked-stats">
              {rankedStats.map((queue: any, index: number) => (
                <div key={index} className="queue-stats">
                  <h4>{queue.queueType.replace('_', ' ')}</h4>
                  <div className="rank-info">
                    <span className="tier">{queue.tier} {queue.rank}</span>
                    <span className="lp">{queue.leaguePoints} LP</span>
                  </div>
                  <div className="win-loss">
                    <span className="wins">{queue.wins}W</span>
                    <span className="losses">{queue.losses}L</span>
                    <span className="winrate">
                      {Math.round((queue.wins / (queue.wins + queue.losses)) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};