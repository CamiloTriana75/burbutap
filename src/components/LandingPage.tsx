import { useMemo, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Trophy, Flame, Zap, Timer, RotateCcw, Users } from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { getTier } from '../utils/tiers';

const REWARD_THRESHOLD = 7_500;

interface Props { onPlay: () => void; hasPlayed: boolean; }

function AnimatedScore({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v).toLocaleString());
  useEffect(() => {
    const controls = animate(count, value, { duration: 1.6, ease: 'easeOut', delay: 0.6 });
    return controls.stop;
  }, [value]);
  return <motion.span>{rounded}</motion.span>;
}

export default function LandingPage({ onPlay, hasPlayed }: Props) {
  const { entries, loading } = useLeaderboard();
  const topScore = entries[0]?.score ?? 0;
  const progressPct = Math.min(100, Math.round((topScore / REWARD_THRESHOLD) * 100));

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
          <div key={b.id} className="absolute rounded-full bg-postobon-red"
            style={{ left: b.left, bottom: '-20px', width: b.size, height: b.size, opacity: b.opacity, animation: `float-up ${b.duration} ${b.delay} infinite linear` }}
          />
        ))}
      </div>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 60%, rgba(227,6,19,0.08) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 pt-14 pb-16 flex-1">

        {/* Logo */}
        <motion.div className="mb-6"
          initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
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
        <motion.div className="flex items-center gap-2 mb-3"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
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
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Burbu-Tap<br /><span style={{ color: '#E30613' }}>Challenge</span>
        </motion.h1>

        <motion.p className="text-white/45 text-sm max-w-xs mb-6 leading-relaxed"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          Toca burbujas, encadena hits y multiplica tu puntaje.<br />
          ¡45 segundos de adrenalina pura!
        </motion.p>

        {/* Reward card */}
        <motion.div
          className="w-full max-w-sm rounded-2xl px-5 py-4 mb-5 text-center"
          style={{ background: 'linear-gradient(135deg, #1a1000, #2d1e00)', border: '1.5px solid rgba(245,200,66,0.38)', boxShadow: '0 4px 28px rgba(245,200,66,0.1)' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45 }}
        >
          <p className="text-yellow-400 font-bold text-base mb-1">🏆 Reto del stand</p>
          <p className="text-white/55 text-xs leading-relaxed">
            Saca <span className="text-yellow-300 font-bold">{REWARD_THRESHOLD.toLocaleString()} puntos o más</span> y reclama<br />
            tu recompensa directamente en el stand.
          </p>
        </motion.div>

        {/* Feature chips */}
        <motion.div className="flex flex-wrap justify-center gap-2 mb-5"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {[
            { icon: <Timer size={11} />, label: '45 segundos' },
            { icon: <Flame size={11} className="text-postobon-red" />, label: 'Combo ×4' },
            { icon: <Trophy size={11} />, label: 'Leaderboard' },
            { icon: <Zap size={11} />, label: 'Burbujas especiales' },
            { icon: <RotateCcw size={11} />, label: 'Solo 1 intento' },
          ].map(chip => (
            <span key={chip.label}
              className="inline-flex items-center gap-1.5 text-white/45 text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
            >
              {chip.icon}{chip.label}
            </span>
          ))}
        </motion.div>

        {/* Bubble tutorial */}
        <motion.div
          className="w-full max-w-sm mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.4 }}
        >
          <p className="text-white/25 text-[9px] uppercase tracking-widest font-semibold text-center mb-3">Tipos de burbujas</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { bg: 'radial-gradient(circle at 32% 28%, rgba(255,115,115,0.98), rgba(227,6,19,0.86) 55%, rgba(160,0,8,0.95))', border: 'rgba(255,190,190,0.28)', glow: 'rgba(227,6,19,0.35)', icon: null, label: 'Normal', desc: 'Puntos base' },
              { bg: 'radial-gradient(circle at 32% 28%, #ffe066, #f5c842 55%, #c8950a)', border: 'rgba(255,220,80,0.75)', glow: 'rgba(245,200,66,0.5)', icon: '⭐', label: 'Dorada', desc: '×3 puntos' },
              { bg: 'radial-gradient(circle at 32% 28%, #555, #1a0000 55%, #0a0000)', border: 'rgba(255,60,60,0.55)', glow: 'rgba(255,30,30,0.35)', icon: '💣', label: 'Bomba', desc: '−5s · ¡Evítala!' },
              { bg: 'radial-gradient(circle at 32% 28%, #d4f4ff, rgba(80,170,255,0.92) 55%, rgba(0,90,200,0.95))', border: 'rgba(140,220,255,0.65)', glow: 'rgba(100,190,255,0.5)', icon: '❄️', label: 'Hielo', desc: 'Congela 3s' },
            ] as const).map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '8px 10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: b.bg, border: `1.5px solid ${b.border}`, boxShadow: `0 0 10px ${b.glow}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {b.icon
                    ? <span style={{ fontSize: 15 }}>{b.icon}</span>
                    : <img src="/postobon-seeklogo.png" alt="" style={{ width: '68%', height: '68%', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.8 }} />
                  }
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>{b.label}</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: 0 }}>{b.desc}</p>
                </div>
              </div>
            ))}
            {/* Frenzy — full width */}
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,100,0,0.06)', border: '1px solid rgba(255,100,0,0.18)', borderRadius: 12, padding: '8px 10px' }}>
              <div style={{ width: 34, height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚡</div>
              <div>
                <p style={{ color: 'rgba(255,160,60,0.9)', fontSize: 12, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>Modo Frenesí</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: 0 }}>Combo 10 → ×4 puntos por 4 segundos</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Ranking global */}
        <motion.div className="w-full max-w-sm mb-2"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.45 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Trophy size={11} className="text-postobon-red" />
              <p className="text-white/35 text-[9px] uppercase tracking-widest font-semibold">Ranking global</p>
              {!loading && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
            </div>
            {!loading && entries.length > 0 && (
              <div className="flex items-center gap-1 text-white/25 text-[9px]">
                <Users size={9} />
                <span>{entries.length} participante{entries.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {loading && <p className="text-white/25 text-xs text-center py-4">Cargando ranking…</p>}
          {!loading && entries.length === 0 && (
            <p className="text-white/20 text-xs text-center py-4">¡Sé el primero en el ranking! 🫧</p>
          )}

          {!loading && entries.length > 0 && (
            <>
              {/* ── Top 1 hero card ── */}
              <motion.div
                className="rounded-2xl px-4 py-3 mb-2 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(227,6,19,0.18), rgba(180,0,0,0.1))', border: '1.5px solid rgba(227,6,19,0.4)', boxShadow: '0 4px 24px rgba(227,6,19,0.15)' }}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55, duration: 0.4, type: 'spring', stiffness: 200 }}
              >
                {/* Glare */}
                <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: '-120%', width: '60%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', animation: 'glare-sweep 3.5s ease 1s infinite', pointerEvents: 'none' }} />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0">🥇</span>
                    <div className="min-w-0 text-left">
                      <p className="text-white font-bold text-sm leading-tight break-words">{entries[0].name}</p>
                      <p className="text-postobon-red/70 text-[10px]">Líder actual</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-postobon-red font-bold text-xl font-mono tabular-nums">
                      <AnimatedScore value={entries[0].score} />
                    </p>
                    <p className="text-white/30 text-[9px]">pts</p>
                    <p className="text-white/40 text-[9px] mt-0.5">
                      {getTier(entries[0].score).title} {getTier(entries[0].score).emoji}
                    </p>
                  </div>
                </div>

                {/* Progress bar toward reward */}
                <div className="mt-3">
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-white/30">Progreso al premio</span>
                    <span className={progressPct >= 100 ? 'text-yellow-400 font-bold' : 'text-white/35'}>
                      {progressPct >= 100 ? '✓ Premio alcanzado' : `${progressPct}% de ${REWARD_THRESHOLD.toLocaleString()} pts`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: progressPct >= 100 ? 'linear-gradient(90deg, #c8950a, #f5c842)' : 'linear-gradient(90deg, #E30613, #ff4545)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ delay: 0.9, duration: 1.2, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Rest of ranking */}
              <div className="space-y-1.5">
                {entries.slice(1, 10).map((entry, i) => (
                  <motion.div
                    key={entry.name + entry.score + i}
                    className="flex items-center justify-between px-4 py-2 rounded-xl"
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.05, duration: 0.25 }}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs w-5 text-center flex-shrink-0">
                        {i === 0 ? '🥈' : i === 1 ? '🥉' : <span className="text-white/25 font-mono">{i + 2}</span>}
                      </span>
                      <span className="text-white/75 text-sm break-words text-left">{entry.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-white/80 font-bold text-sm font-mono tabular-nums">{entry.score.toLocaleString()}</p>
                      <p className="text-white/35 text-[9px]">{getTier(entry.score).title} {getTier(entry.score).emoji}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.45 }}
          className="w-full max-w-sm mt-6"
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
              style={{ background: 'linear-gradient(135deg, #E30613 0%, #b0000b 100%)', boxShadow: '0 12px 48px rgba(227,6,19,0.55), 0 4px 14px rgba(0,0,0,0.4)' }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.7 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Jugar Burbu-Tap Challenge"
            >
              <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: '-120%', width: '70%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)', animation: 'glare-sweep 2.6s ease 1.2s infinite', pointerEvents: 'none' }} />
              🫧 ¡Jugar ahora!
            </motion.button>
          )}
        </motion.div>

        <motion.p className="mt-4 text-white/20 text-[10px] tracking-wide"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
        >
          Gratis · Sin registro · Sonido activable · 1 intento por dispositivo
        </motion.p>

      </div>
    </div>
  );
}
