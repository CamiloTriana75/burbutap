import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import BurbuTap from './components/BurbuTap';
import { checkDevice, getDeviceId } from './utils/leaderboard';

export default function App() {
  const [checking, setChecking]   = useState(true);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [playing, setPlaying]     = useState(false);

  useEffect(() => {
    const deviceId = getDeviceId();
    checkDevice(deviceId)
      .then(played => {
        // Si Firebase dice que no ha jugado, limpia el localStorage por si quedó stale
        if (!played) {
          localStorage.removeItem('burbutap_played');
          localStorage.removeItem('burbutap_score');
        }
        setHasPlayed(played);
      })
      .catch(() => {
        // Sin conexión: usa localStorage como fallback
        setHasPlayed(!!localStorage.getItem('burbutap_played'));
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-postobon-red border-t-transparent animate-spin" />
          <p className="text-white/25 text-xs tracking-widest uppercase">Cargando…</p>
        </div>
      </div>
    );
  }

  if (playing) return <BurbuTap onClose={() => setPlaying(false)} />;
  return <LandingPage onPlay={() => setPlaying(true)} hasPlayed={hasPlayed} />;
}
