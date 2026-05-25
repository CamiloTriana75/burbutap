import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Share2, RefreshCw, Flame } from 'lucide-react';
import { addScore, registerDevice, getDeviceId } from '../utils/leaderboard';
import type { ScoreEntry } from '../utils/leaderboard';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { playPop, playComboUp, playMiss, playStart, playEnd, playTick, playGold, playBomb, playIce, playFrenzy, startMusic, stopMusic, setMusicBPM } from '../utils/sounds';

// ── Constants ──────────────────────────────────────────────────────────────
const GAME_DURATION     = 45_000;
const SPAWN_START       = 460;   // ms — rápido desde el inicio
const SPAWN_END         = 120;   // ms — frenético al final
const REWARD_THRESHOLD  = 7_500; // pts para reclamar recompensa
const PLAYED_KEY        = 'burbutap_played';
const SCORE_KEY         = 'burbutap_score';

const FUN_FACTS = [
  'Postobón fue fundada en 1904 en Medellín — más de 120 años refrescando Colombia.',
  'Postobón produce más de 2 millones de litros de bebidas al día en sus plantas.',
  'La empresa exporta sus productos a más de 15 países de América Latina.',
  'Postobón lidera el mercado colombiano de bebidas con más del 40% de participación.',
  'En 2024, Postobón reportó crecimiento sostenido en ventas nacionales e internacionales.',
  'El portafolio de Postobón incluye más de 200 referencias de bebidas.',
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function getMultiplier(combo: number, frenzyActive = false): number {
  if (frenzyActive) return 4;
  if (combo < 2)  return 1;
  if (combo < 4)  return 1.5;
  if (combo < 6)  return 2;
  if (combo < 8)  return 2.5;
  if (combo < 10) return 3;
  return 4;
}

// ── Types ──────────────────────────────────────────────────────────────────
type GamePhase = 'intro' | 'countdown' | 'playing' | 'end' | 'blocked';
type BubbleType = 'normal' | 'gold' | 'bomb' | 'ice';

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  createdAt: number;
  lifetime: number;
  type: BubbleType;
}

interface TapEffect  { id: number; x: number; y: number; }
interface MissEffect { id: number; x: number; y: number; withCombo: boolean; }
interface ScorePopup { id: number; pts: number; multi: number; x: number; y: number; }
interface Particle { id: number; x: number; y: number; angle: number; dist: number; color: string; size: number; }

let nextId = 0;

function makeBubble(progress: number, type: BubbleType = 'normal'): Bubble {
  const minLife = lerp(1150, 820,  progress);
  const maxLife = lerp(1900, 1250, progress);
  const base    = 48 + Math.random() * 46;
  return {
    id: nextId++,
    x:        7  + Math.random() * 83,
    y:        14 + Math.random() * 70,
    size:     base,
    createdAt: Date.now(),
    lifetime: type === 'gold'
      ? (minLife + Math.random() * (maxLife - minLife)) * 0.68
      : minLife + Math.random() * (maxLife - minLife),
    type,
  };
}

// ── LeaderboardPanel ──────────────────────────────────────────────────────
function LeaderboardPanel({ entries, loading, error, className }: {
  entries: ScoreEntry[];
  loading: boolean;
  error:   boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.45 }}
    >
      <div className="flex items-center justify-center gap-2 mb-3">
        <Trophy size={11} className="text-postobon-red" />
        <p className="text-white/35 text-[9px] uppercase tracking-widest font-semibold">
          Ranking global
        </p>
        {!loading && !error && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" title="En vivo" />
        )}
      </div>

      {loading && (
        <p className="text-white/25 text-xs text-center py-4">Cargando ranking…</p>
      )}
      {error && (
        <p className="text-red-400/60 text-xs text-center py-4">Sin conexión — el ranking no está disponible</p>
      )}
      {!loading && !error && entries.length === 0 && (
        <p className="text-white/20 text-xs text-center py-4">Sé el primero en el ranking 🫧</p>
      )}
      {!loading && !error && entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.slice(0, 5).map((entry, i) => (
            <motion.div
              key={entry.name + entry.score + i}
              className="flex items-center justify-between px-4 py-2 rounded-xl"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              style={{
                background: i === 0 ? 'rgba(227,6,19,0.13)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${i === 0 ? 'rgba(227,6,19,0.3)' : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs w-5 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-white/25 font-mono">{i + 1}</span>}
                </span>
                <span className="text-white/80 text-sm truncate max-w-[120px]">{entry.name}</span>
              </div>
              <span className="text-white font-bold text-sm font-mono">{entry.score}</span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
interface Props { onClose: () => void; }

export default function BurbuTap({ onClose }: Props) {
  const [phase, setPhase]               = useState<GamePhase>(() => localStorage.getItem(PLAYED_KEY) ? 'blocked' : 'intro');
  const [bubbles, setBubbles]           = useState<Bubble[]>([]);
  const [score, setScore]               = useState(0);
  const [combo, setCombo]               = useState(0);
  const [timeLeft, setTimeLeft]         = useState(GAME_DURATION);
  const [finalScore, setFinalScore]     = useState(0);
  const [playerName, setPlayerName]     = useState('');
  const [scoreSaved, setScoreSaved]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState(false);
  const { entries: leaderboard, loading: lbLoading, error: lbError } = useLeaderboard();
  const [copied, setCopied]             = useState(false);
  const [tapEffects, setTapEffects]     = useState<TapEffect[]>([]);
  const [missEffects, setMissEffects]   = useState<MissEffect[]>([]);
  const [scorePopups, setScorePopups]   = useState<ScorePopup[]>([]);
  const [comboFlash, setComboFlash]     = useState<'up' | 'miss' | null>(null);
  const [showReward, setShowReward]     = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);
  const [funFact]                       = useState(() => FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);

  const [frozen, setFrozen]         = useState(false);
  const frozenRef                   = useRef(false);
  const frozenAtRef                 = useRef(0);
  const frozenTimeoutRef            = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimeRef    = useRef(0);
  const spawnRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef          = useRef(0);
  const scoreRef        = useRef(0);
  const comboRef        = useRef(0);
  const phaseRef        = useRef<GamePhase>('intro');
  const lastTickSecRef  = useRef(-1);
  const lastGoldSpawnRef   = useRef(0);
  const lastIceSpawnRef    = useRef(0);
  const lastTimeStateRef   = useRef(0);  // throttle setTimeLeft to 100 ms
  const [frenzy, setFrenzy]           = useState(false);
  const frenzyRef                     = useRef(false);
  const frenzyTimeoutRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frenzyTriggeredRef            = useRef(false);

  const [shakeKey, setShakeKey]         = useState(0);
  const [shakeProfile, setShakeProfile] = useState<'soft' | 'hard' | 'bomb'>('soft');
  const [particles, setParticles]       = useState<Particle[]>([]);

  function triggerShake(profile: 'soft' | 'hard' | 'bomb') {
    setShakeProfile(profile);
    setShakeKey(k => k + 1);
  }

  function spawnParticles(x: number, y: number, bubbleType: BubbleType, frenzyActive: boolean) {
    const count  = bubbleType === 'gold' ? 12 : frenzyActive ? 16 : 8;
    const minDist = bubbleType === 'gold' ? 45 : frenzyActive ? 50 : 28;
    const maxDist = bubbleType === 'gold' ? 80 : frenzyActive ? 90 : 58;
    const colors = bubbleType === 'gold' ? ['#ffd700', '#f5c842', '#ffe066', '#fff8a0']
      : bubbleType === 'ice' ? ['#80ccff', '#c0eeff', '#ffffff', '#4db8ff']
      : frenzyActive ? ['#ff6600', '#ff3300', '#ff9900', '#ffffff']
      : ['#E30613', '#ff4545', '#ffffff', '#ff8080'];
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: performance.now() + i + Math.random(), x, y,
      angle: (i / count) * Math.PI * 2 + Math.random() * 0.4,
      dist: minDist + Math.random() * (maxDist - minDist),
      color: colors[i % colors.length], size: 3 + Math.random() * 3,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => { setParticles(prev => prev.filter(p => !newParticles.some(n => n.id === p.id))); }, 600);
  }

  function clearTimers() {
    if (spawnRef.current)         clearTimeout(spawnRef.current);
    if (cleanupRef.current)       clearInterval(cleanupRef.current);
    if (frozenTimeoutRef.current) clearTimeout(frozenTimeoutRef.current);
    if (frenzyTimeoutRef.current) clearTimeout(frenzyTimeoutRef.current);
    cancelAnimationFrame(rafRef.current);
  }

  useEffect(() => () => { clearTimers(); stopMusic(); }, []);

  const endGame = useCallback(() => {
    phaseRef.current = 'end';
    clearTimers();
    const s = scoreRef.current;
    playEnd(s);
    stopMusic();
    setFinalScore(s);
    setBubbles([]);
    localStorage.setItem(PLAYED_KEY, '1');
    localStorage.setItem(SCORE_KEY, String(s));
    void registerDevice(getDeviceId());
    setPhase('end');
  }, []);

  const startGame = useCallback(() => {
    clearTimers();
    phaseRef.current  = 'playing';
    nextId            = 0;
    scoreRef.current  = 0;
    comboRef.current  = 0;
    lastTickSecRef.current = -1;
    lastGoldSpawnRef.current = 0;
    lastIceSpawnRef.current  = 0;
    frozenRef.current = false;
    setFrozen(false);
    frenzyRef.current          = false;
    frenzyTriggeredRef.current = false;
    setFrenzy(false);
    setScore(0); setCombo(0); setBubbles([]);
    setTapEffects([]); setMissEffects([]); setScorePopups([]); setParticles([]);
    setTimeLeft(GAME_DURATION); setScoreSaved(false); setSaving(false); setSaveError(false);
    setPlayerName(''); setComboFlash(null); setShowReward(false);
    startTimeRef.current = Date.now();
    setPhase('playing');
    startMusic();

    // Dynamic spawn: speed increases quadratically over 60 s
    function scheduleSpawn() {
      if (phaseRef.current !== 'playing') return;
      const now      = Date.now();
      const elapsed  = now - startTimeRef.current;
      if (elapsed >= GAME_DURATION) { endGame(); return; }
      const progress = Math.min(1, elapsed / GAME_DURATION);
      const eased    = progress * progress;
      const delay    = lerp(SPAWN_START, SPAWN_END, eased);

      const bombProb = elapsed > 10_000 ? Math.min(0.07, progress * 0.14) : 0;
      const rand     = Math.random();

      let type: BubbleType = 'normal';

      if (elapsed > 10_000 && now - lastGoldSpawnRef.current >= 15_000) {
        type = 'gold';
        lastGoldSpawnRef.current = now;
      } else if (elapsed > 10_000 && now - lastIceSpawnRef.current >= 20_000) {
        type = 'ice';
        lastIceSpawnRef.current = now;
      } else if (rand < bombProb) {
        type = 'bomb';
      } else if (rand < bombProb + 0.10) {
        type = 'gold';
        lastGoldSpawnRef.current = now;
      } else if (rand < bombProb + 0.13) {
        type = 'ice';
        lastIceSpawnRef.current = now;
      }

      const frenzyActive = frenzyRef.current;
      const bubble = makeBubble(progress, type);
      if (frenzyActive && type === 'normal') bubble.size = Math.round(bubble.size * 1.2);

      setBubbles(prev => [...prev, bubble]);
      spawnRef.current = setTimeout(scheduleSpawn, delay);
    }
    scheduleSpawn();

    // Expire bubbles + detect natural misses
    cleanupRef.current = setInterval(() => {
      if (frozenRef.current) return;   // skip expiry while frozen
      const now = Date.now();
      setBubbles(prev => {
        const expired = prev.filter(b => now - b.createdAt >= b.lifetime);
        const active  = prev.filter(b => now - b.createdAt <  b.lifetime);
        // Bombs expiring naturally are a success (player avoided them) — no penalty
        const missedNonBomb = expired.filter(b => b.type !== 'bomb');
        if (missedNonBomb.length > 0) {
          const had = comboRef.current;
          comboRef.current = 0;
          setCombo(0);
          if (had >= 2) {
            setComboFlash('miss');
            setTimeout(() => setComboFlash(null), 420);
            playMiss();
          }
        }
        return active;
      });
    }, 200);

    // Countdown rAF + tick SFX
    function tick() {
      if (!frozenRef.current) {
        const remaining = Math.max(0, GAME_DURATION - (Date.now() - startTimeRef.current));
        const now = performance.now();
        if (now - lastTimeStateRef.current >= 100) {
          lastTimeStateRef.current = now;
          setTimeLeft(remaining);
        }
        const elapsedMs = GAME_DURATION - remaining;
        const targetBPM = elapsedMs < 15_000 ? 135
                        : elapsedMs < 35_000 ? Math.round(135 + ((elapsedMs - 15_000) / 20_000) * 25)
                        : 160;
        setMusicBPM(frenzyRef.current ? 175 : targetBPM);
        const sec = Math.ceil(remaining / 1000);
        if (remaining < 6000 && remaining > 0 && sec !== lastTickSecRef.current) {
          lastTickSecRef.current = sec;
          playTick();
        }
        if (remaining <= 0 && phaseRef.current === 'playing') return; // endGame via scheduleSpawn
      }
      if (phaseRef.current === 'playing')
        rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [endGame]);

  // Countdown 3 → 2 → 1 → ¡Ya! → startGame
  useEffect(() => {
    if (phase !== 'countdown') return;
    let n = 3;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    setCountdownNum(n);
    playTick();

    const intervalId = setInterval(() => {
      n--;
      setCountdownNum(n);
      if (n > 0) {
        playTick();
      } else {
        clearInterval(intervalId);
        playStart();
        timeoutId = setTimeout(() => startGame(), 600);
      }
    }, 900);

    return () => {
      clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [phase, startGame]);

  // ── Bubble tap ────────────────────────────────────────────────────────────
  function tapBubble(bubble: Bubble, e: React.PointerEvent) {
    e.stopPropagation(); // prevent background miss-tap handler

    const tx = (e.clientX / window.innerWidth)  * 100;
    const ty = (e.clientY / window.innerHeight) * 100;

    // ── Bomb: penalty, no points ─────────────────────────────────────────────
    if (bubble.type === 'bomb') {
      setBubbles(prev => prev.filter(b => b.id !== bubble.id));
      startTimeRef.current -= 5_000;
      const had = comboRef.current;
      comboRef.current = 0;
      setCombo(0);
      if (had >= 1) {
        setComboFlash('miss');
        setTimeout(() => setComboFlash(null), 500);
      }
      playBomb();
      triggerShake('bomb');

      const bid = performance.now() + Math.random() + 3;
      setScorePopups(p => [...p, { id: bid, pts: -1, multi: 0, x: tx, y: ty }]);
      setTimeout(() => setScorePopups(p => p.filter(s => s.id !== bid)), 900);
      return;
    }

    // ── Ice: freeze, no points ────────────────────────────────────────────────
    if (bubble.type === 'ice') {
      setBubbles(prev => prev.filter(b => b.id !== bubble.id));
      frozenAtRef.current  = Date.now();
      frozenRef.current    = true;
      setFrozen(true);
      playIce();

      const iid = performance.now() + Math.random() + 4;
      setScorePopups(p => [...p, { id: iid, pts: 999, multi: 0, x: tx, y: ty }]);
      setTimeout(() => setScorePopups(p => p.filter(s => s.id !== iid)), 900);

      if (frozenTimeoutRef.current) clearTimeout(frozenTimeoutRef.current);
      frozenTimeoutRef.current = setTimeout(() => {
        // compensate with exact frozen duration so the timer is truly paused
        startTimeRef.current += Date.now() - frozenAtRef.current;
        frozenRef.current    = false;
        setFrozen(false);
      }, 3000);
      return;
    }

    // ── Normal / Gold: score and combo ────────────────────────────────────────
    const age      = Date.now() - bubble.createdAt;
    const speed    = 1 - Math.min(1, age / bubble.lifetime);
    const newCombo = comboRef.current + 1;
    const multi    = getMultiplier(newCombo, frenzyRef.current);
    const goldBonus = bubble.type === 'gold' ? 3 : 1;
    const base      = 10 + Math.round(speed * 8);
    const pts       = Math.round(base * multi * goldBonus);

    comboRef.current  = newCombo;
    scoreRef.current += pts;
    setScore(s => s + pts);
    setCombo(newCombo);
    if (newCombo >= 10) triggerShake('hard'); else if (newCombo >= 5) triggerShake('soft');

    if (newCombo >= 10 && !frenzyRef.current && !frenzyTriggeredRef.current) {
      frenzyRef.current          = true;
      frenzyTriggeredRef.current = true;
      setFrenzy(true);
      playFrenzy();
      if (frenzyTimeoutRef.current) clearTimeout(frenzyTimeoutRef.current);
      frenzyTimeoutRef.current = setTimeout(() => {
        frenzyRef.current = false;
        setFrenzy(false);
      }, 4000);
    }

    const prevMulti = getMultiplier(newCombo - 1, frenzyRef.current);
    if (multi > prevMulti) {
      setComboFlash('up');
      setTimeout(() => setComboFlash(null), 500);
      playComboUp(Math.round(multi));
    } else {
      playPop(newCombo);
    }

    if (bubble.type === 'gold') playGold();

    setBubbles(prev => prev.filter(b => b.id !== bubble.id));

    const eid = performance.now() + Math.random();
    setTapEffects(p => [...p, { id: eid, x: tx, y: ty }]);
    setTimeout(() => setTapEffects(p => p.filter(t => t.id !== eid)), 520);
    spawnParticles(tx, ty, bubble.type, frenzyRef.current);

    const sid = performance.now() + Math.random() + 1;
    setScorePopups(p => [...p, { id: sid, pts, multi, x: tx, y: ty }]);
    setTimeout(() => setScorePopups(p => p.filter(s => s.id !== sid)), 800);
  }

  // ── Wrong (background) tap ────────────────────────────────────────────────
  function handleBgTap(e: React.PointerEvent) {
    if (phase !== 'playing') return;
    const tx = (e.clientX / window.innerWidth)  * 100;
    const ty = (e.clientY / window.innerHeight) * 100;
    const had = comboRef.current;

    // Always show visual
    const mid = performance.now() + Math.random() + 2;
    setMissEffects(p => [...p, { id: mid, x: tx, y: ty, withCombo: had >= 2 }]);
    setTimeout(() => setMissEffects(p => p.filter(m => m.id !== mid)), 650);

    if (had >= 1) {
      comboRef.current = 0;
      setCombo(0);
      if (had >= 2) {
        setComboFlash('miss');
        setTimeout(() => setComboFlash(null), 420);
        playMiss();
      }
    }
  }

  // ── Share / save ──────────────────────────────────────────────────────────
  async function handleShare() {
    const text = `🔴 ¡Logré ${finalScore} pts en Burbu-Tap Challenge de Postobón! ¿Puedes superarme? 🫧`;
    if (navigator.share) {
      try { await navigator.share({ text, title: 'Burbu-Tap Challenge' }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
    }
  }

  async function handleSaveScore() {
    if (!playerName.trim() || saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      await addScore({ name: playerName.trim(), score: finalScore });
      setScoreSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const timeProgress   = timeLeft / GAME_DURATION;
  const secondsLeft    = Math.ceil(timeLeft / 1000);
  const urgent         = timeLeft < 8000 && timeLeft > 0;
  const currentMulti   = getMultiplier(combo, frenzy);
  const showCombo      = combo >= 2;

  const bgHeat       = Math.min(1, (1 - timeProgress) * 1.1 + Math.min(combo, 10) * 0.012);
  const bgSaturation = Math.round(bgHeat * 60);
  const bgLightStart = Math.round(2 + bgHeat * 4);
  const bgLightMid   = Math.round(3 + bgHeat * 9);
  const dynamicBg    = `linear-gradient(160deg, hsl(0, ${bgSaturation}%, ${bgLightStart}%) 0%, hsl(0, ${30 + bgSaturation}%, ${bgLightMid}%) 45%, hsl(0, ${bgSaturation}%, ${bgLightStart}%) 100%)`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{ background: phase === 'playing' ? dynamicBg : 'linear-gradient(160deg, #0A0A0A 0%, #1c0000 45%, #0A0A0A 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 text-white/30 hover:text-white/70 transition-colors p-2 cursor-pointer"
        aria-label="Cerrar"
      >
        <X size={20} />
      </button>

      <AnimatePresence mode="wait">

        {/* ── BLOCKED ────────────────────────────────────────────────────── */}
        {phase === 'blocked' && (
          <motion.div
            key="blocked"
            className="flex flex-col items-center justify-center h-full px-6 text-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="text-6xl mb-5"
              animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              🔒
            </motion.div>

            <h2 className="font-display font-bold text-white mb-2" style={{ fontSize: 'clamp(1.6rem, 8vw, 2.4rem)' }}>
              Ya participaste
            </h2>
            <p className="text-white/40 text-sm max-w-xs mb-2 leading-relaxed">
              Cada dispositivo tiene un solo intento en el stand.
            </p>

            {(() => {
              const prev = localStorage.getItem(SCORE_KEY);
              return prev ? (
                <motion.p
                  className="text-postobon-red font-bold text-2xl mb-6"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 220, damping: 14 }}
                >
                  Tu puntaje: {Number(prev).toLocaleString()} pts
                </motion.p>
              ) : <div className="mb-6" />;
            })()}

            <LeaderboardPanel entries={leaderboard} loading={lbLoading} error={lbError} className="w-full max-w-xs mb-6" />

            <button onClick={onClose} className="text-white/22 text-xs py-2 hover:text-white/50 transition-colors cursor-pointer">
              Volver al inicio
            </button>
          </motion.div>
        )}

        {/* ── INTRO ──────────────────────────────────────────────────────── */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            className="flex flex-col items-center h-full overflow-y-auto py-10 px-6 text-center"
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -28 }}
            transition={{ duration: 0.4 }}
          >
            {/* Bubble icon */}
            <motion.div
              className="relative mt-4 mb-6"
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
                style={{
                  background: 'radial-gradient(circle at 32% 30%, rgba(255,100,100,0.95), rgba(227,6,19,0.82) 58%, rgba(155,0,8,0.95))',
                  border: '1.5px solid rgba(255,170,170,0.3)',
                  boxShadow: '0 0 56px rgba(227,6,19,0.6), 0 0 100px rgba(227,6,19,0.2), inset 0 0 20px rgba(255,255,255,0.1)',
                }}
              >
                🫧
              </div>
              <div className="absolute rounded-full pointer-events-none" style={{ width: '30%', height: '22%', top: '18%', left: '22%', background: 'rgba(255,255,255,0.42)' }} />
            </motion.div>

            <h2 className="font-display font-bold text-white mb-1" style={{ fontSize: 'clamp(1.9rem, 9vw, 3rem)' }}>
              Burbu-Tap
            </h2>
            <p className="text-postobon-red font-semibold text-xs tracking-widest uppercase mb-5">Challenge</p>

            <p className="text-white/40 text-sm max-w-xs mb-5 leading-relaxed">
              Toca burbujas antes de que desaparezcan.<br />
              ¡Encadena hits para subir el multiplicador!<br />
              <span className="text-postobon-red/70">Tocar fuera = combo reset.</span>
            </p>

            {/* Bubble guide */}
            <div className="grid grid-cols-2 gap-2 mb-5 w-full max-w-xs">
              {([
                { bg: 'radial-gradient(circle at 32% 28%, rgba(255,115,115,0.98), rgba(227,6,19,0.86) 55%, rgba(160,0,8,0.95))', border: 'rgba(255,190,190,0.28)', glow: 'rgba(227,6,19,0.35)', icon: <span style={{ fontSize: 16 }}>🫧</span>, label: 'Normal', desc: 'Puntos base' },
                { bg: 'radial-gradient(circle at 32% 28%, #ffe066, #f5c842 55%, #c8950a)',                                         border: 'rgba(255,220,80,0.75)',  glow: 'rgba(245,200,66,0.5)', icon: <span style={{ fontSize: 14 }}>⭐</span>, label: 'Dorada', desc: '×3 puntos' },
                { bg: 'radial-gradient(circle at 32% 28%, #555, #1a0000 55%, #0a0000)',                                           border: 'rgba(255,60,60,0.55)',   glow: 'rgba(255,30,30,0.35)', icon: <span style={{ fontSize: 16 }}>💣</span>, label: 'Bomba', desc: '¡Evítala!' },
                { bg: 'radial-gradient(circle at 32% 28%, #d4f4ff, rgba(80,170,255,0.92) 55%, rgba(0,90,200,0.95))',             border: 'rgba(140,220,255,0.65)', glow: 'rgba(100,190,255,0.5)', icon: <span style={{ fontSize: 16 }}>❄️</span>, label: 'Hielo', desc: 'Congela 2s' },
              ] as const).map(b => (
                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '8px 10px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: b.bg, border: `1.5px solid ${b.border}`, boxShadow: `0 0 10px ${b.glow}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {b.icon}
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>{b.label}</p>
                    <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, margin: 0 }}>{b.desc}</p>
                  </div>
                </div>
              ))}
              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,100,0,0.06)', border: '1px solid rgba(255,100,0,0.18)', borderRadius: 12, padding: '8px 10px' }}>
                <div style={{ width: 34, height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚡</div>
                <div>
                  <p style={{ color: 'rgba(255,160,60,0.9)', fontSize: 12, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>Modo Frenesí</p>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, margin: 0 }}>Combo 10 → ×4 pts por 4 seg</p>
                </div>
              </div>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {[['⏱', '45 segundos'], ['⚡', 'Combo hasta 4×'], ['🚀', 'Velocidad aumenta'], ['✕', 'Miss = reset']].map(([icon, label]) => (
                <span key={label} className="flex items-center gap-1.5 text-white/38 text-xs px-3 py-1.5 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                  {icon} {label}
                </span>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setPhase('countdown')}
              className="font-bold text-white px-14 py-4 rounded-2xl text-lg cursor-pointer mb-7"
              style={{ background: 'linear-gradient(135deg, #E30613, #b0000b)', boxShadow: '0 8px 40px rgba(227,6,19,0.55)' }}
            >
              ¡Jugar!
            </motion.button>

            {/* Leaderboard — always visible on intro */}
            <LeaderboardPanel entries={leaderboard} loading={lbLoading} error={lbError} className="w-full max-w-xs" />
          </motion.div>
        )}

        {/* ── COUNTDOWN ──────────────────────────────────────────────────── */}
        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            className="flex flex-col items-center justify-center h-full select-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.25 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={countdownNum}
                className="flex flex-col items-center"
                initial={{ scale: 0.4, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.6, opacity: 0, y: -20 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18, duration: 0.35 }}
              >
                {countdownNum > 0 ? (
                  <>
                    <motion.span
                      className="font-display font-bold text-white leading-none"
                      style={{
                        fontSize: 'clamp(8rem, 40vw, 12rem)',
                        textShadow: '0 0 80px rgba(227,6,19,0.7), 0 0 160px rgba(227,6,19,0.35)',
                        color: countdownNum === 1 ? '#ff4040' : countdownNum === 2 ? '#ff7070' : '#ffffff',
                      }}
                    >
                      {countdownNum}
                    </motion.span>
                    <motion.p
                      className="text-white/30 text-sm uppercase tracking-widest mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                    >
                      {countdownNum === 3 ? 'Prepárate…' : countdownNum === 2 ? 'Listos…' : '¡Ahora!'}
                    </motion.p>
                  </>
                ) : (
                  <>
                    <motion.span
                      className="font-display font-bold leading-none"
                      style={{
                        fontSize: 'clamp(4rem, 22vw, 7rem)',
                        color: '#E30613',
                        textShadow: '0 0 60px rgba(227,6,19,0.9), 0 0 120px rgba(227,6,19,0.5)',
                      }}
                    >
                      ¡Ya!
                    </motion.span>
                    <motion.p
                      className="text-postobon-red/60 text-sm uppercase tracking-widest mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      ¡Toca las burbujas!
                    </motion.p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Pulsing ring behind the number */}
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 220, height: 220,
                border: '2px solid rgba(227,6,19,0.25)',
                boxShadow: '0 0 60px rgba(227,6,19,0.2)',
              }}
              animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}

        {/* ── PLAYING ────────────────────────────────────────────────────── */}
        {phase === 'playing' && (
          <motion.div
            key="playing"
            className="relative h-full w-full select-none touch-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={handleBgTap}
          >
            <motion.div
              key={shakeKey}
              className="absolute inset-0"
              animate={shakeKey === 0 ? {} : {
                x: shakeProfile === 'bomb'
                  ? [0, -10, 10, -8, 8, -5, 5, 0]
                  : shakeProfile === 'hard'
                    ? [0, -7, 7, -5, 5, -3, 3, 0]
                    : [0, -3, 3, -2, 2, 0],
                y: shakeProfile === 'bomb' ? [0, -3, 3, 0] : 0,
              }}
              transition={{ duration: shakeProfile === 'bomb' ? 0.4 : 0.28, ease: 'easeOut' }}
            >
            {/* Heartbeat pulse */}
            <AnimatePresence>
              {urgent && (
                <motion.div
                  key="heartbeat"
                  className="absolute inset-0 pointer-events-none z-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.08, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ background: 'radial-gradient(ellipse at center, rgba(255,0,0,0.4) 0%, transparent 70%)' }}
                />
              )}
            </AnimatePresence>

            {/* Timer bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 z-20" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <motion.div
                className="h-full origin-left"
                style={{
                  scaleX: timeProgress,
                  background: urgent
                    ? 'linear-gradient(90deg, #ff1818, #ff7070)'
                    : 'linear-gradient(90deg, #E30613, #ff4545)',
                }}
                transition={{ duration: 0.11, ease: 'linear' }}
              />
            </div>

            {/* Speed indicator strip */}
            <div
              className="absolute top-1.5 left-0 right-0 h-[2px] pointer-events-none z-20 opacity-30"
              style={{
                background: `linear-gradient(90deg, transparent ${timeProgress * 100}%, rgba(255,255,255,0.25) ${timeProgress * 100}%)`,
              }}
            />

            {/* HUD */}
            <div className="absolute top-4 left-0 right-0 z-20 flex justify-between items-start px-5 pointer-events-none">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={secondsLeft}
                  className={`font-mono tabular-nums font-bold text-lg leading-none ${urgent ? 'text-postobon-red' : 'text-white/50'}`}
                  initial={{ scale: urgent ? 1.6 : 1.1, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.16 }}
                >
                  {secondsLeft}s
                </motion.div>
              </AnimatePresence>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={score}
                  className="text-right"
                  initial={{ scale: 1.3, y: -5 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="text-white font-bold font-mono tabular-nums" style={{ fontSize: 'clamp(1.3rem, 5vw, 1.7rem)' }}>
                    {score}
                  </span>
                  <span className="text-postobon-red text-sm ml-1">pts</span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Combo badge */}
            <AnimatePresence>
              {showCombo && (
                <motion.div
                  key="combo"
                  className="absolute left-0 right-0 z-20 flex flex-col items-center pointer-events-none"
                  style={{ top: '68px' }}
                  initial={{ opacity: 0, y: -8, scale: 0.85 }}
                  animate={{
                    opacity: 1, y: 0, scale: 1,
                    ...(comboFlash === 'up'   ? { scale: [1, 1.3, 1] }            : {}),
                    ...(comboFlash === 'miss' ? { x: [-7, 7, -5, 5, 0] }          : {}),
                  }}
                  exit={{ opacity: 0, scale: 0.8, y: -6 }}
                  transition={{ duration: 0.22 }}
                >
                  <div
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full"
                    style={{
                      background: comboFlash === 'miss'
                        ? 'rgba(120,0,0,0.65)'
                        : frenzy
                          ? 'rgba(255,80,0,0.22)'
                          : currentMulti >= 3
                            ? 'rgba(255,90,0,0.18)'
                            : 'rgba(227,6,19,0.15)',
                      border: `1px solid ${
                        comboFlash === 'miss'  ? 'rgba(255,60,60,0.4)'
                        : frenzy               ? 'rgba(255,120,0,0.6)'
                        : currentMulti >= 3    ? 'rgba(255,130,0,0.45)'
                        : 'rgba(227,6,19,0.32)'
                      }`,
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <Flame size={11} className={frenzy ? 'text-orange-400' : currentMulti >= 3 ? 'text-orange-400' : 'text-postobon-red'} />
                    <span className="text-white font-bold text-sm">{frenzy ? '🔥 FRENESÍ' : `${combo} hits`}</span>
                    <span className="font-bold text-sm ml-1" style={{ color: currentMulti >= 3 ? '#ff8c00' : '#E30613' }}>
                      ×{currentMulti % 1 === 0 ? currentMulti : currentMulti.toFixed(1)}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bubbles */}
            <AnimatePresence>
              {bubbles.map(bubble => {
                const bubbleStyle: React.CSSProperties = (() => {
                  if (bubble.type === 'gold') return {
                    background: 'radial-gradient(circle at 32% 28%, #ffe066, #f5c842 55%, #c8950a)',
                    border:     '2px solid rgba(255,220,80,0.75)',
                    boxShadow:  `0 0 28px rgba(245,200,66,0.75), 0 0 60px rgba(245,200,66,0.3), inset 0 2px 8px rgba(255,255,255,0.18)`,
                  };
                  if (bubble.type === 'bomb') return {
                    background: 'radial-gradient(circle at 32% 28%, #555, #1a0000 55%, #0a0000)',
                    border:     '2px solid rgba(255,60,60,0.55)',
                    boxShadow:  `0 0 20px rgba(255,30,30,0.45), inset 0 2px 8px rgba(0,0,0,0.4)`,
                  };
                  if (bubble.type === 'ice') return {
                    background: 'radial-gradient(circle at 32% 28%, #d4f4ff, rgba(80,170,255,0.92) 55%, rgba(0,90,200,0.95))',
                    border:     '2px solid rgba(140,220,255,0.65)',
                    boxShadow:  `0 0 26px rgba(100,190,255,0.65), inset 0 2px 8px rgba(255,255,255,0.22)`,
                  };
                  return {
                    background: 'radial-gradient(circle at 32% 28%, rgba(255,115,115,0.98), rgba(227,6,19,0.86) 55%, rgba(160,0,8,0.95))',
                    border:     '1.5px solid rgba(255,190,190,0.28)',
                    boxShadow:  `0 0 ${18 + Math.min(combo, 8) * 3}px rgba(227,6,19,${0.36 + Math.min(0.28, combo * 0.04)}), inset 0 2px 8px rgba(255,255,255,0.12)`,
                  };
                })();

                return (
                <motion.button
                  key={bubble.id}
                  className="absolute rounded-full cursor-pointer"
                  style={{
                    left:        `${bubble.x}%`,
                    top:         `${bubble.y}%`,
                    width:       bubble.size,
                    height:      bubble.size,
                    marginLeft:  -bubble.size / 2,
                    marginTop:   -bubble.size / 2,
                    willChange:  'transform, opacity',
                    ...bubbleStyle,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0, transition: { duration: 0.14 } }}
                  transition={{ duration: 0.19, ease: [0.22, 1, 0.36, 1] }}
                  whileTap={{ scale: 0.82 }}
                  onPointerDown={e => tapBubble(bubble, e)}
                  aria-label="Burbuja"
                >
                  <div className="absolute rounded-full pointer-events-none" style={{ width: '32%', height: '24%', top: '17%', left: '20%', background: 'rgba(255,255,255,0.44)' }} />
                  {bubble.type === 'gold' && (
                    <motion.span
                      className="absolute inset-0 flex items-center justify-center text-xl pointer-events-none"
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    >⭐</motion.span>
                  )}
                  {bubble.type === 'normal' && (
                    <img
                      src="/postobon-seeklogo.png"
                      alt=""
                      className="absolute pointer-events-none"
                      style={{ width: '68%', height: '68%', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.82 }}
                    />
                  )}
                  {bubble.type === 'bomb' && (
                    <>
                      <span className="absolute inset-0 flex items-center justify-center text-xl pointer-events-none">💣</span>
                      <motion.div
                        className="absolute pointer-events-none"
                        style={{ width: 4, height: 10, top: -4, right: '28%', background: 'linear-gradient(to top, #ff4400, #ffcc00)', borderRadius: 2 }}
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.4, repeat: Infinity }}
                      />
                    </>
                  )}
                  {bubble.type === 'ice' && (
                    <span className="absolute inset-0 flex items-center justify-center text-xl pointer-events-none">❄️</span>
                  )}
                </motion.button>
                );
              })}
            </AnimatePresence>

            {/* Tap rings (success) */}
            <AnimatePresence>
              {tapEffects.map(te => (
                <motion.div
                  key={te.id}
                  className="absolute pointer-events-none z-30 rounded-full"
                  style={{ left: `${te.x}%`, top: `${te.y}%`, width: 52, height: 52, marginLeft: -26, marginTop: -26, border: '2px solid rgba(227,6,19,0.75)' }}
                  initial={{ scale: 0.35, opacity: 0.9 }}
                  animate={{ scale: 2.8, opacity: 0 }}
                  exit={{}}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              ))}
            </AnimatePresence>

            {/* Miss effects (wrong tap) */}
            <AnimatePresence>
              {missEffects.map(me => (
                <motion.div
                  key={me.id}
                  className="absolute pointer-events-none z-30 flex flex-col items-center gap-1"
                  style={{ left: `${me.x}%`, top: `${me.y}%`, transform: 'translate(-50%, -50%)' }}
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{ opacity: 0, y: -28, scale: 0.8 }}
                  exit={{}}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                >
                  <div
                    className="rounded-full flex items-center justify-center font-bold text-sm"
                    style={{
                      width: 36, height: 36,
                      background: me.withCombo ? 'rgba(220,0,0,0.35)' : 'rgba(150,0,0,0.2)',
                      border: `1.5px solid rgba(255,60,60,${me.withCombo ? 0.6 : 0.25})`,
                      color: me.withCombo ? 'rgba(255,100,100,0.95)' : 'rgba(255,80,80,0.45)',
                    }}
                  >
                    ✕
                  </div>
                  {me.withCombo && (
                    <span className="text-[10px] font-bold" style={{ color: 'rgba(255,80,80,0.7)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                      COMBO ROTO
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Score popups */}
            <AnimatePresence>
              {scorePopups.map(sp => (
                <motion.div
                  key={sp.id}
                  className="absolute pointer-events-none z-30 font-bold font-mono text-center"
                  style={{ left: `${sp.x}%`, top: `${sp.y}%`, transform: 'translate(-50%, -130%)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
                  initial={{ opacity: 1, y: 0, scale: 0.9 }}
                  animate={{ opacity: 0, y: -46, scale: 1.1 }}
                  exit={{}}
                  transition={{ duration: 0.75, ease: 'easeOut' }}
                >
                  <span style={{
                    color: sp.pts === -1    ? '#ff4444'
                         : sp.pts === 999   ? '#80ccff'
                         : sp.multi >= 3    ? '#ffaa00'
                         : sp.multi >= 2    ? '#ff8080'
                         : '#ffffff',
                    fontSize: sp.multi >= 2 ? '1.05rem' : '0.88rem',
                  }}>
                    {sp.pts === -1 ? '−5s 💥' : sp.pts === 999 ? '❄️ +FREEZE' : `+${sp.pts}`}
                  </span>
                  {sp.multi > 1 && (
                    <span style={{ color: sp.multi >= 3 ? '#ffaa00' : '#ff9090', fontSize: '0.7rem', marginLeft: 3 }}>
                      ×{sp.multi % 1 === 0 ? sp.multi : sp.multi.toFixed(1)}
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Particle explosions */}
            <AnimatePresence>
              {particles.map(p => (
                <motion.div
                  key={p.id}
                  className="absolute pointer-events-none z-30 rounded-full"
                  style={{
                    left: `${p.x}%`, top: `${p.y}%`,
                    width: p.size, height: p.size,
                    marginLeft: -p.size / 2, marginTop: -p.size / 2,
                    background: p.color,
                    willChange: 'transform, opacity',
                  }}
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  animate={{ opacity: 0, x: Math.cos(p.angle) * p.dist, y: Math.sin(p.angle) * p.dist, scale: 0 }}
                  exit={{}}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                />
              ))}
            </AnimatePresence>

            {/* Ice freeze overlay */}
            <AnimatePresence>
              {frozen && (
                <motion.div
                  className="absolute inset-0 pointer-events-none z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    background: 'rgba(80,170,255,0.06)',
                    border: '3px solid rgba(140,220,255,0.22)',
                    backdropFilter: 'blur(0.5px)',
                  }}
                />
              )}
            </AnimatePresence>

            {/* Frenzy border overlay */}
            <AnimatePresence>
              {frenzy && (
                <motion.div
                  className="absolute inset-0 pointer-events-none z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    background: 'transparent',
                    boxShadow: 'inset 0 0 0 5px rgba(255,100,0,0.55), inset 0 0 60px rgba(255,60,0,0.18)',
                  }}
                />
              )}
            </AnimatePresence>

            <p className="absolute bottom-8 left-0 right-0 text-center text-white/16 text-[9px] tracking-widest uppercase pointer-events-none">
              ¡Toca las burbujas!
            </p>
            </motion.div>
          </motion.div>
        )}

        {/* ── END ────────────────────────────────────────────────────────── */}
        {phase === 'end' && (
          <motion.div
            key="end"
            className="flex flex-col items-center h-full overflow-y-auto py-10 px-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38 }}
          >
            {finalScore > 0 && (
              <>
                <p className="text-white/28 text-[9px] tracking-widest uppercase mt-2 mb-2">¡Tiempo!</p>
                <motion.p
                  className="font-display font-bold text-postobon-red"
                  style={{ fontSize: 'clamp(4rem, 20vw, 6rem)', lineHeight: 1 }}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 14, delay: 0.1 }}
                >
                  {finalScore}
                </motion.p>
                <p className="text-white/40 text-base mb-3">puntos</p>

                {/* Reward banner */}
                {finalScore >= REWARD_THRESHOLD && (
                  <motion.div
                    className="w-full max-w-sm mb-4"
                    initial={{ opacity: 0, scale: 0.88, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.4 }}
                  >
                    <motion.button
                      onClick={() => setShowReward(true)}
                      className="w-full py-4 rounded-2xl font-bold text-white text-base cursor-pointer relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #c8950a, #f5c842, #c8950a)',
                        boxShadow: '0 0 40px rgba(245,200,66,0.5), 0 8px 24px rgba(0,0,0,0.4)',
                      }}
                      animate={{ boxShadow: ['0 0 40px rgba(245,200,66,0.5)', '0 0 70px rgba(245,200,66,0.8)', '0 0 40px rgba(245,200,66,0.5)'] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: '-120%', width: '70%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)', animation: 'glare-sweep 2s ease 0.8s infinite', pointerEvents: 'none' }} />
                      🏆 ¡Reclamar recompensa!
                    </motion.button>
                    <p className="text-yellow-400/60 text-[10px] text-center mt-1.5">Superaste los {REWARD_THRESHOLD.toLocaleString()} pts</p>
                  </motion.div>
                )}

                {leaderboard.length > 0 && finalScore >= (leaderboard[0]?.score ?? 0) && (
                  <motion.p className="text-yellow-400 text-xs mb-3 font-semibold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    🏆 ¡Nuevo récord!
                  </motion.p>
                )}
                {(leaderboard.length === 0 || finalScore < (leaderboard[0]?.score ?? 0)) && finalScore < REWARD_THRESHOLD && <div className="mb-1" />}
              </>
            )}

            {finalScore === 0 && <p className="text-white/35 text-sm mt-6 mb-4 font-semibold">Tabla de posiciones</p>}

            {/* Fun fact */}
            {finalScore > 0 && (
              <motion.div
                className="w-full max-w-sm rounded-2xl mb-5 p-4"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.45 }}
                style={{ background: 'rgba(227,6,19,0.07)', border: '1px solid rgba(227,6,19,0.2)' }}
              >
                <p className="text-[9px] text-postobon-red uppercase tracking-widest font-semibold mb-1.5">¿Sabías que…?</p>
                <p className="text-white/70 text-sm leading-relaxed">{funFact}</p>
              </motion.div>
            )}

            {/* Save score */}
            {finalScore > 0 && !scoreSaved && (
              <div className="w-full max-w-sm mb-5">
                <p className="text-white/32 text-[11px] mb-2 text-center">¿Cómo te llamas? (para el ranking global)</p>
                <div className="flex gap-2">
                  <input
                    type="text" maxLength={20} placeholder="Tu nombre..."
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void handleSaveScore()}
                    className="flex-1 rounded-xl px-4 py-2.5 text-white text-sm outline-none placeholder:text-white/18"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => void handleSaveScore()}
                    disabled={!playerName.trim() || saving}
                    className="px-4 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-40 cursor-pointer min-w-[80px]"
                    style={{ background: '#E30613' }}
                  >
                    {saving ? '...' : 'Guardar'}
                  </button>
                </div>
                {saveError && (
                  <p className="text-red-400 text-[10px] mt-1.5 text-center">
                    Error al guardar. ¿Hay conexión a internet?{' '}
                    <button className="underline cursor-pointer" onClick={() => void handleSaveScore()}>Reintentar</button>
                  </p>
                )}
              </div>
            )}
            {scoreSaved && (
              <motion.p className="text-postobon-red text-sm mb-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                ✓ Score guardado en el ranking global
              </motion.p>
            )}

            {/* Leaderboard */}
            <LeaderboardPanel entries={leaderboard} loading={lbLoading} error={lbError} className="w-full max-w-sm mb-6" />

            {/* Actions */}
            <div className="flex gap-3 w-full max-w-sm mb-4">
              {finalScore > 0 && (
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white/60 cursor-pointer"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
                >
                  <Share2 size={13} />
                  {copied ? '¡Copiado!' : 'Compartir'}
                </button>
              )}
              <div
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white/30"
                style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
              >
                <RefreshCw size={13} />
                Solo un intento
              </div>

            </div>

            <button onClick={onClose} className="text-white/22 text-xs py-2 hover:text-white/50 transition-colors cursor-pointer">
              Volver al inicio
            </button>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── REWARD TICKET ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            className="absolute inset-0 z-[110] flex flex-col items-center justify-center overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #0d0800, #2a1800, #0d0800)' }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Confetti particles */}
            {Array.from({ length: 24 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 6 + (i % 4) * 4,
                  height: 6 + (i % 4) * 4,
                  background: i % 3 === 0 ? '#E30613' : i % 3 === 1 ? '#f5c842' : '#ff8c00',
                  left: '50%', top: '50%',
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((i / 24) * Math.PI * 2) * (120 + (i % 3) * 60),
                  y: Math.sin((i / 24) * Math.PI * 2) * (120 + (i % 3) * 60),
                  opacity: 0, scale: 0,
                }}
                transition={{ duration: 1.2, delay: i * 0.04, ease: 'easeOut' }}
              />
            ))}

            {/* Back button */}
            <button
              onClick={() => setShowReward(false)}
              className="absolute top-4 left-4 z-10 text-yellow-400/50 hover:text-yellow-400/90 transition-colors p-2 cursor-pointer text-sm flex items-center gap-1"
            >
              ← Volver
            </button>

            {/* Ticket card */}
            <motion.div
              className="relative mx-6 rounded-3xl overflow-hidden text-center"
              style={{
                background: 'linear-gradient(160deg, #1a1000, #2d1e00)',
                border: '2px solid rgba(245,200,66,0.45)',
                boxShadow: '0 0 60px rgba(245,200,66,0.2), 0 20px 60px rgba(0,0,0,0.6)',
                maxWidth: 360,
                width: '100%',
              }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 18 }}
            >
              {/* Gold top strip */}
              <div style={{ background: 'linear-gradient(90deg, #c8950a, #f5c842, #c8950a)', height: 4 }} />

              <div className="px-8 py-8">
                {/* Trophy */}
                <motion.div
                  className="text-6xl mb-4"
                  animate={{ rotate: [-4, 4, -4], y: [0, -6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  🏆
                </motion.div>

                <p className="text-yellow-400/70 text-[10px] uppercase tracking-[0.25em] font-semibold mb-2">
                  ¡Felicitaciones!
                </p>

                {playerName && (
                  <p className="text-white/60 text-sm mb-1">{playerName} logró</p>
                )}

                <motion.p
                  className="font-display font-bold mb-1"
                  style={{ fontSize: 'clamp(3rem, 18vw, 4.5rem)', lineHeight: 1, color: '#f5c842' }}
                  animate={{ textShadow: ['0 0 20px rgba(245,200,66,0.4)', '0 0 40px rgba(245,200,66,0.8)', '0 0 20px rgba(245,200,66,0.4)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {finalScore}
                </motion.p>
                <p className="text-yellow-400/50 text-sm mb-6">puntos en Burbu-Tap</p>

                {/* Dashed divider */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex-1 border-t border-dashed border-yellow-400/20" />
                  <span className="text-yellow-400/30 text-xs">✦</span>
                  <div className="flex-1 border-t border-dashed border-yellow-400/20" />
                </div>

                {/* Claim instruction */}
                <div
                  className="rounded-2xl px-5 py-4 mb-5"
                  style={{ background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)' }}
                >
                  <p className="text-yellow-300 font-bold text-sm mb-1">🎁 Premio disponible</p>
                  <p className="text-white/55 text-xs leading-relaxed">
                    Muestra esta pantalla en el stand de Postobón para reclamar tu recompensa.
                  </p>
                </div>

                {/* Branding */}
                <div className="flex items-center justify-center gap-2 opacity-40">
                  <img src="/postobon-seeklogo.png" alt="Postobón" style={{ width: 60, filter: 'invert(1) hue-rotate(180deg) sepia(1) saturate(2) hue-rotate(10deg)' }} draggable={false} />
                </div>
                <p className="text-white/20 text-[9px] mt-2">Burbu-Tap Challenge · UCEVA 2026</p>
              </div>

              {/* Gold bottom strip */}
              <div style={{ background: 'linear-gradient(90deg, #c8950a, #f5c842, #c8950a)', height: 4 }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
