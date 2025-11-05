import { useState, useEffect } from 'react';
import { UserAuth } from './components/UserAuth';
import { Dashboard } from './components/Dashboard';
import { storage } from './utils/storage';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userPuuid, setUserPuuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const isAuth = storage.isUserAuthenticated();
    const userData = storage.getUserData();
    
    if (isAuth && userData) {
      setIsAuthenticated(true);
      setUserPuuid(userData.puuid);
    }
    
    setLoading(false);
  }, []);

  const handleAuthSuccess = (puuid: string) => {
    setUserPuuid(puuid);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserPuuid(null);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading Rift Rewind...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {!isAuthenticated ? (
        <UserAuth onAuthSuccess={handleAuthSuccess} />
      ) : (
        <Dashboard puuid={userPuuid!} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
