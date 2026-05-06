import React, { useState } from 'react';
import { REGIONS } from '../config/api';
import type { UserCredentials } from '../types/user';
import { apiService } from '../services/api';
import { storage } from '../utils/storage';
import logo from '../assets/logo.png';

interface UserAuthProps {
  onAuthSuccess: (puuid: string) => void;
}

export const UserAuth: React.FC<UserAuthProps> = ({ onAuthSuccess }) => {
  const [formData, setFormData] = useState<UserCredentials>({
    gameName: '',
    tagLine: '',
    region: 'americas'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!formData.gameName.trim()) {
        throw new Error('Game name is required');
      }
      if (!formData.tagLine.trim()) {
        throw new Error('Tag line is required');
      }

      // Call API to get PUUID
      const userData = await apiService.getRiotPuuid(formData);

      // Save to localStorage
      storage.saveUserCredentials(formData);
      storage.saveUserData(userData);

      // Notify parent component
      onAuthSuccess(userData.puuid);

    } catch (err: any) {
      console.error('Authentication failed:', err);
      if (err.status === 404) {
        setError('Player not found. Please check your Riot ID and region.');
      } else if (err.status === 429) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError(err.message || 'Failed to authenticate. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="auth-container">
      {/* Hero Section */}
      <div className="landing-hero">
        <img src={logo} alt="Rift Rewind" className="hero-logo" />
        <h1 className="hero-title">Rift Rewind</h1>
        <p className="hero-subtitle">Your AI-Powered League of Legends Coach</p>
        <p className="hero-description">
          Unlock comprehensive performance analysis, match predictions, and AI-powered insights to elevate your gameplay
        </p>
      </div>

      {/* Features Grid */}
      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Performance Analysis</h3>
          <p>Track champion mastery, summoner spells, and rune choices with detailed win rate breakdowns</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Match History</h3>
          <p>Deep dive into your games with team composition analysis, timelines, and AI predictions</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔮</div>
          <h3>Match Predictions</h3>
          <p>Get AI-powered predictions for custom team compositions and real-time champion winrates</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🤖</div>
          <h3>AI Assistant</h3>
          <p>Context-aware chatbot that helps you understand your data and navigate the platform</p>
        </div>
      </div>

      {/* Login Card */}
      <div className="auth-card">
        <h2>Get Started</h2>
        <p className="auth-card-subtitle">Enter your Riot ID to unlock personalized coaching insights</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="gameName">Game Name</label>
            <input
              type="text"
              id="gameName"
              name="gameName"
              value={formData.gameName}
              onChange={handleInputChange}
              placeholder="Your game name"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="tagLine">Tag Line</label>
            <input
              type="text"
              id="tagLine"
              name="tagLine"
              value={formData.tagLine}
              onChange={handleInputChange}
              placeholder="Your tag (e.g., NA1)"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="region">Region</label>
            <select
              id="region"
              name="region"
              value={formData.region}
              onChange={handleInputChange}
              disabled={loading}
              required
            >
              {Object.entries(REGIONS).map(([label, value]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Start Coaching'}
          </button>
        </form>

        <div className="auth-footer">
          <p>🎮 Free to use • 🔒 Secure • ⚡ Powered by Riot Games API & Google Gemini AI</p>
        </div>
      </div>
    </div>
  );
};