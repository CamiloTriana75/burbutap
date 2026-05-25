import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, Zap, Timer, RotateCcw } from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard';

const REWARD_THRESHOLD = 7_500;
const PLAYED_KEY = 'burbutap_played';

interface Props { onPlay: () => void; }

export default function LandingPage({ onPlay }: Props) {
  const { entries, loading } = useLeaderboard();
  const hasPlayed = !!localStorage.getItem(PLAYED_KEY);

  const bubbles = useMemo(() =>
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      size: 22 + (i % 6) * 20,
      left: `${((i * 6.5 + 3) % 90) + 4}%`,
      delay: `${(i * 0.65) % 9}s`,
      duration: `${9 + (i % 5) * 2.5}s`,
      opacity: 0.05 + (i % 4) * 0.035,
    })), []);

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(175deg, #0a0a0a 0%, #1c0000 50%, #0a0a0a 100%)' }}
    >
      {/* Floating bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {bubbles.map(b => (
          <div
            key={b.id}
            className="absolute rounded-full bg-postobon-red"
            style={{
              left: b.left, bottom: '-20px',
              width: b.size, height: b.size,
              opacity: b.opacity,
              animation: `float-up ${b.duration} ${b.delay} infinite linear`,
            }}
          />
        ))}
      </div>

      {/* Radial glow center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 60%, rgba(227,6,19,0.08) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 pt-14 pb-16 flex-1">

        {/* Logo */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 16 }}
        >
          <div className="relative inline-block">
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle at 32% 30%, rgba(255,100,100,0.95), rgba(227,6,19,0.85) 58%, rgba(155,0,8,0.95))',
                boxShadow: '0 0 60px rgba(227,6,19,0.55), 0 0 120px rgba(227,6,19,0.2)',
                border: '1.5px solid rgba(255,170,170,0.25)',
              }}
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img src="/postobon-seeklogo.png" alt="Postobón" style={{ width: '65%', height: '65%', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
            </motion.div>
            <div className="absolute rounded-full pointer-events-none" style={{ width: '30%', height: '22%', top: '18%', left: '22%', background: 'rgba(255,255,255,0.38)' }} />
          </div>
        </motion.div>

        {/* Eyebrow */}
        <motion.div
          className="flex items-center gap-2 mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div className="h-px w-7 bg-postobon-red opacity-50" />
          <span className="text-postobon-red text-[10px] uppercase tracking-[0.22em] font-semibold">Mini-juego exclusivo del stand</span>
          <div className="h-px w-7 bg-postobon-red opacity-50" />
        </motion.div>

        {/* Title */}
        <motion.h1
          className="font-display font-bold leading-tight mb-2"
          style={{ fontSize: 'clamp(2.2rem, 10vw, 4rem)', color: '#ffffff' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Burbu-Tap
          <br />
          <span style={{ color: '#E30613' }}>Challenge</span>
        </motion.h1>

        <motion.p
          className="text-white/45 text-sm max-w-xs mb-6 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          Toca burbujas, encadena hits y multiplica tu puntaje.<br />
          ¡45 segundos de adrenalina pura!
        </motion.p>

        {/* Reward card */}
        <motion.div
          className="w-full max-w-sm rounded-2xl px-5 py-4 mb-5 text-center"
          style={{
            background: 'linear-gradient(135deg, #1a1000, #2d1e00)',
            border: '1.5px solid rgba(245,200,66,0.38)',
            boxShadow: '0 4px 28px rgba(245,200,66,0.1)',
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45 }}
        >
          <p className="text-yellow-400 font-bold text-base mb-1">🏆 Reto del stand</p>
          <p className="text-white/55 text-xs leading-relaxed">
            Saca <span className="text-yellow-300 font-bold">{REWARD_THRESHOLD.toLocaleString()} puntos o más</span> y reclama<br />
            tu recompensa directamente en el stand.
          </p>
        </motion.div>

        {/* Feature chips */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mb-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {[
            { icon: <Timer size={11} />, label: '45 segundos' },
            { icon: <Flame size={11} className="text-postobon-red" />, label: 'Combo ×4' },
            { icon: <Trophy size={11} />, label: 'Leaderboard' },
            { icon: <Zap size={11} />, label: 'Burbujas especiales' },
            { icon: <RotateCcw size={11} />, label: 'Solo 1 intento' },
          ].map(chip => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1.5 text-white/45 text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
            >
              {chip.icon}
              {chip.label}
            </span>
          ))}
        </motion.div>

        {/* Ranking global */}
        <motion.div
          className="w-full max-w-sm mb-7"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.45 }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Trophy size={11} className="text-postobon-red" />
            <p className="text-white/35 text-[9px] uppercase tracking-widest font-semibold">Ranking global</p>
            {!loading && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" title="En vivo" />}
          </div>

          {loading && <p className="text-white/25 text-xs text-center py-4">Cargando ranking…</p>}

          {!loading && entries.length === 0 && (
            <p className="text-white/20 text-xs text-center py-4">¡Sé el primero en el ranking! 🫧</p>
          )}

          {!loading && entries.length > 0 && (
            <div className="space-y-1.5">
              {entries.slice(0, 10).map((entry, i) => (
                <motion.div
                  key={entry.name + entry.score + i}
                  className="flex items-center justify-between px-4 py-2 rounded-xl"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05, duration: 0.28 }}
                  style={{
                    background: i === 0 ? 'rgba(227,6,19,0.13)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${i === 0 ? 'rgba(227,6,19,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-5 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-white/25 font-mono">{i + 1}</span>}
                    </span>
                    <span className="text-white/80 text-sm truncate max-w-[140px]">{entry.name}</span>
                  </div>
                  <span className="text-white font-bold text-sm font-mono">{entry.score.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.45 }}
          className="w-full max-w-sm"
        >
          {hasPlayed ? (
            <div className="w-full py-4 rounded-2xl text-center font-bold text-white/30 text-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              🔒 Ya participaste
            </div>
          ) : (
            <motion.button
              onClick={onPlay}
              className="relative overflow-hidden w-full font-bold text-white py-5 rounded-2xl text-xl cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #E30613 0%, #b0000b 100%)',
                boxShadow: '0 12px 48px rgba(227,6,19,0.55), 0 4px 14px rgba(0,0,0,0.4)',
              }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.7 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Jugar Burbu-Tap Challenge"
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', top: 0, left: '-120%',
                  width: '70%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
                  animation: 'glare-sweep 2.6s ease 1.2s infinite',
                  pointerEvents: 'none',
                }}
              />
              🫧 ¡Jugar ahora!
            </motion.button>
          )}
        </motion.div>

        <motion.p
          className="mt-4 text-white/20 text-[10px] tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          Gratis · Sin registro · Sonido activable · 1 intento por dispositivo
        </motion.p>

      </div>
    </div>
  );
}
