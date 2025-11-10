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
      <div className="auth-card">
        <img src={logo} alt="Rift Rewind" className="auth-logo" />
        <h1>Rift Rewind Coach</h1>
        <p>Enter your Riot ID to get personalized coaching insights</p>
        
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
      </div>
    </div>
  );
};