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
  const [isBlurred, setIsBlurred] = useState(false);

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
      setIsBlurred(false); // Unblur on activity if we are not locked yet
      timeout = setTimeout(() => {
        console.log("Auto-locking due to inactivity");
        onLogout();
      }, LOCK_TIME);
    };

    // Smart Privacy Triggers
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        // Optional: Require click or something to unblur? 
        // For now, let's keep it blurred until user interacts
      }
    };

    const handleWindowBlur = () => {
      setIsBlurred(true);
    };

    const handleWindowFocus = () => {
      // We could auto-unblur, or wait for interaction
      // setIsBlurred(false); 
    };

    // Start timer
    resetTimer();

    // Listen for activity
    events.forEach(event => window.addEventListener(event, resetTimer));

    // Privacy Listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearTimeout(timeout);
      events.forEach(event => window.removeEventListener(event, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
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
      {isBlurred && isAuthenticated && (
        <div className="privacy-overlay" onClick={() => setIsBlurred(false)}>
          Click to Reveal
        </div>
      )}
      <div className={isBlurred && isAuthenticated ? 'privacy-blur' : ''} style={{ transition: 'filter 0.3s' }}>
        {view === 'auth' && <Auth onLogin={onLogin} />}
        {view === 'vault' && <Vault onLogout={onLogout} />}
      </div>
    </>
  );
}

export default App;
