import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Vault from './components/Vault';
import * as StorageService from './services/storage';

function App() {
  const [view, setView] = useState('loading'); // loading, auth, vault

  useEffect(() => {
    checkLogin();
  }, []);

  // Auto-lock Hook
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = StorageService.getToken();
    if (token) setIsAuthenticated(true);
  }, [view]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let timeout;
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    const LOCK_TIME = 5 * 60 * 1000; // 5 minutes

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        console.log("Auto-locking due to inactivity");
        onLogout();
      }, LOCK_TIME);
    };

    // Start timer
    resetTimer();

    // Listen for activity
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timeout);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated]);

  const checkLogin = () => {
    const token = StorageService.getToken();
    if (token) {
      // If we have a token, we might show vault, 
      // BUT for security we might want to ask for Master Password again if key is not in memory?
      // For this MVP, if we reload, memoryKey is lost.
      // So effectively, even if we have a token (for sync), we can't decrypt without the user entering the password again.
      // So we should show Auth Login screen, but maybe pre-filled or just normal.

      // If we are just refreshing, we need to re-login to derive the key. 
      // So defaulting to 'auth' is correct.
      setView('auth');
    } else {
      setView('auth');
    }
  };

  const onLogin = () => {
    setView('vault');
  };

  const onLogout = () => {
    setView('auth');
  };

  if (view === 'loading') return null;

  return (
    <>
      {view === 'auth' && <Auth onLogin={onLogin} />}
      {view === 'vault' && <Vault onLogout={onLogout} />}
    </>
  );
}

export default App;
