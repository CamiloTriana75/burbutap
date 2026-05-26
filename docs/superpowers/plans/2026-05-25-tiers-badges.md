# Tiers & Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 score-based tiers shown in the global leaderboard, and up to 3 personal achievement badges revealed at the end of each game with emoji, name, and description.

**Architecture:** Pure client-side. `getTier(score)` and `getBadges(stats)` are pure utility functions in a new `src/utils/tiers.ts`. Badge stats are tracked via refs during gameplay and evaluated in `endGame()`. No Firestore schema changes needed — tier is always derivable from score.

**Tech Stack:** React + TypeScript, Framer Motion (existing), no new dependencies.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/tiers.ts` | Create | `getTier`, `getBadges`, all types |
| `src/components/BurbuTap.tsx` | Modify | Badge refs, wiring, end screen badges + tier, LeaderboardPanel tier |
| `src/components/LandingPage.tsx` | Modify | Tier label in global leaderboard |

---

## Task 1: Create `src/utils/tiers.ts`

**Files:**
- Create: `src/utils/tiers.ts`

- [ ] **Step 1: Create the file with the complete implementation**

```typescript
export interface TierInfo {
  title: string;
  emoji: string;
}

export function getTier(score: number): TierInfo {
  if (score >= 10_000) return { title: 'Leyenda',          emoji: '👑' };
  if (score >= 7_500)  return { title: 'Campeón Postobón', emoji: '🏆' };
  if (score >= 6_500)  return { title: 'Élite',            emoji: '⚡' };
  if (score >= 4_500)  return { title: 'Veterano',         emoji: '🔥' };
  if (score >= 2_500)  return { title: 'Retador',          emoji: '💪' };
  if (score >= 1_000)  return { title: 'Aficionado',       emoji: '🌱' };
  return                      { title: 'Novato',           emoji: '🫧' };
}

export interface BadgeStats {
  bombsHit:        number;
  iceUsed:         number;
  goldHit:         number;
  frenzyActivated: boolean;
  missCount:       number;
  maxCombo:        number;
  scoreAt20s:      number;
  endCombo:        number;
}

export interface BadgeResult {
  emoji: string;
  name:  string;
  desc:  string;
}

// Ordered from rarest to most common — first 3 that pass are shown
const BADGE_DEFS: Array<{ check: (s: BadgeStats) => boolean } & BadgeResult> = [
  { emoji: '👑', name: 'Perfección',  desc: 'Terminaste el juego con combo activo',   check: s => s.endCombo >= 1 },
  { emoji: '⚡', name: 'Imparable',   desc: 'Alcanzaste combo ×15 o más',             check: s => s.maxCombo >= 15 },
  { emoji: '🥷', name: 'Ninja',       desc: 'No tocaste ninguna bomba',               check: s => s.bombsHit === 0 },
  { emoji: '⭐', name: 'Cazador',     desc: 'Tocaste 5 burbujas doradas',             check: s => s.goldHit >= 5 },
  { emoji: '💨', name: 'Veloz',       desc: '3.000 pts en los primeros 20 segundos',  check: s => s.scoreAt20s >= 3_000 },
  { emoji: '❄️', name: 'Polar',       desc: 'Usaste 3 burbujas de hielo',             check: s => s.iceUsed >= 3 },
  { emoji: '🔥', name: 'En llamas',   desc: 'Activaste el Modo Frenesí',              check: s => s.frenzyActivated },
  { emoji: '🎯', name: 'Puntería',    desc: 'Menos de 5 fallos en la partida',        check: s => s.missCount < 5 },
];

export function getBadges(stats: BadgeStats): BadgeResult[] {
  return BADGE_DEFS
    .filter(b => b.check(stats))
    .slice(0, 3)
    .map(({ emoji, name, desc }) => ({ emoji, name, desc }));
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```
Expected: `✓ built in Xms` with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/tiers.ts
git commit -m "feat: add getTier and getBadges utilities"
```

---

## Task 2: Add badge tracking refs to `BurbuTap.tsx`

**Files:**
- Modify: `src/components/BurbuTap.tsx`

- [ ] **Step 1: Add import at the top of `BurbuTap.tsx`**

Add to the existing import block (line 4 area, after the leaderboard import):

```typescript
import { getTier, getBadges } from '../utils/tiers';
import type { BadgeStats, BadgeResult } from '../utils/tiers';
```

- [ ] **Step 2: Add 8 badge-tracking refs**

Find the block that ends with:
```typescript
  const frenzyTriggeredRef            = useRef(false);
```

Add immediately after:
```typescript
  // Badge tracking
  const bombsHitRef            = useRef(0);
  const iceUsedRef             = useRef(0);
  const goldHitRef             = useRef(0);
  const missCountRef           = useRef(0);
  const maxComboRef            = useRef(0);
  const scoreAt20sRef          = useRef(0);
  const score20sCapturedRef    = useRef(false);
  const endComboRef            = useRef(0);
```

- [ ] **Step 3: Add `earnedBadges` state**

Find the line:
```typescript
  const [shakeKey, setShakeKey]         = useState(0);
```

Add before it:
```typescript
  const [earnedBadges, setEarnedBadges] = useState<BadgeResult[]>([]);
```

- [ ] **Step 4: Reset all badge refs in `startGame()`**

Find inside `startGame()` the line:
```typescript
    frenzyTriggeredRef.current = false;
```

Add immediately after:
```typescript
    bombsHitRef.current         = 0;
    iceUsedRef.current          = 0;
    goldHitRef.current          = 0;
    missCountRef.current        = 0;
    maxComboRef.current         = 0;
    scoreAt20sRef.current       = 0;
    score20sCapturedRef.current = false;
    endComboRef.current         = 0;
    setEarnedBadges([]);
```

- [ ] **Step 5: Increment `bombsHitRef` in the bomb branch of `tapBubble()`**

Find inside the bomb branch:
```typescript
      startTimeRef.current -= 5_000;
```

Add immediately after:
```typescript
      bombsHitRef.current++;
```

- [ ] **Step 6: Increment `iceUsedRef` in the ice branch of `tapBubble()`**

Find inside the ice branch:
```typescript
      frozenAtRef.current  = Date.now();
```

Add immediately after:
```typescript
      iceUsedRef.current++;
```

- [ ] **Step 7: Increment `goldHitRef` and `maxComboRef` in the normal/gold branch of `tapBubble()`**

Find inside the normal/gold branch:
```typescript
    comboRef.current  = newCombo;
    scoreRef.current += pts;
```

Add immediately after:
```typescript
    maxComboRef.current = Math.max(maxComboRef.current, newCombo);
    if (bubble.type === 'gold') goldHitRef.current++;
```

- [ ] **Step 8: Increment `missCountRef` in `handleBgTap()`**

Find:
```typescript
  function handleBgTap(e: React.PointerEvent) {
    if (phase !== 'playing') return;
```

Add immediately after the phase guard:
```typescript
    missCountRef.current++;
```

- [ ] **Step 9: Increment `missCountRef` for expired bubbles in the cleanup interval**

Find inside the `setInterval` cleanup:
```typescript
        if (missedNonBomb.length > 0) {
```

Add at the start of that `if` block:
```typescript
          missCountRef.current += missedNonBomb.length;
```

- [ ] **Step 10: Capture `scoreAt20sRef` inside `tick()`**

Find inside `tick()`, inside the `if (!frozenRef.current)` block:
```typescript
        const elapsedMs = GAME_DURATION - remaining;
```

Add immediately after:
```typescript
        if (elapsedMs >= 20_000 && !score20sCapturedRef.current) {
          scoreAt20sRef.current       = scoreRef.current;
          score20sCapturedRef.current = true;
        }
```

- [ ] **Step 11: Verify build passes**

```bash
npm run build
```
Expected: `✓ built in Xms` with no TypeScript errors.

- [ ] **Step 12: Commit**

```bash
git add src/components/BurbuTap.tsx
git commit -m "feat: add badge tracking refs and stat wiring in BurbuTap"
```

---

## Task 3: Evaluate badges in `endGame()` and update `LeaderboardPanel`

**Files:**
- Modify: `src/components/BurbuTap.tsx`

- [ ] **Step 1: Evaluate badges in `endGame()`**

Find inside `endGame()`:
```typescript
    localStorage.setItem(PLAYED_KEY, '1');
    localStorage.setItem(SCORE_KEY, String(s));
```

Add immediately after:
```typescript
    endComboRef.current = comboRef.current;
    const badgeStats: BadgeStats = {
      bombsHit:        bombsHitRef.current,
      iceUsed:         iceUsedRef.current,
      goldHit:         goldHitRef.current,
      frenzyActivated: frenzyTriggeredRef.current,
      missCount:       missCountRef.current,
      maxCombo:        maxComboRef.current,
      scoreAt20s:      scoreAt20sRef.current,
      endCombo:        comboRef.current,
    };
    setEarnedBadges(getBadges(badgeStats));
```

- [ ] **Step 2: Update `LeaderboardPanel` to show tier**

Find inside `LeaderboardPanel`, the map over `entries.slice(0, 5)`. The inner JSX currently is:

```tsx
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
```

Replace with:

```tsx
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
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xs w-5 text-center flex-shrink-0">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-white/25 font-mono">{i + 1}</span>}
                  </span>
                  <span className="text-white/80 text-sm break-words min-w-0">{entry.name}</span>
                </div>
                <div className="flex flex-col items-end flex-shrink-0 ml-2">
                  <span className="text-white font-bold text-sm font-mono">{entry.score.toLocaleString()}</span>
                  <span className="text-white/35 text-[9px] whitespace-nowrap">
                    {getTier(entry.score).title} {getTier(entry.score).emoji}
                  </span>
                </div>
              </motion.div>
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```
Expected: `✓ built in Xms` with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/BurbuTap.tsx
git commit -m "feat: evaluate badges in endGame, show tier in LeaderboardPanel"
```

---

## Task 4: Add tier label and badges section to end screen

**Files:**
- Modify: `src/components/BurbuTap.tsx`

- [ ] **Step 1: Add tier label under the final score**

Find in the `end` phase JSX:
```tsx
                <p className="text-white/40 text-base mb-3">puntos</p>
```

Replace with:
```tsx
                <p className="text-white/40 text-base mb-1">puntos</p>
                <motion.p
                  className="text-white/50 text-sm mb-3 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {getTier(finalScore).title} {getTier(finalScore).emoji}
                </motion.p>
```

- [ ] **Step 2: Add badges section before the fun fact card**

Find in the `end` phase JSX:
```tsx
            {/* Fun fact */}
            {finalScore > 0 && (
```

Add immediately before that block:
```tsx
            {/* Earned badges */}
            {earnedBadges.length > 0 && (
              <motion.div
                className="w-full max-w-sm mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.4 }}
              >
                <p className="text-white/25 text-[9px] uppercase tracking-widest text-center mb-2">Tus logros</p>
                <div className="space-y-2">
                  {earnedBadges.map((badge, i) => (
                    <motion.div
                      key={badge.name}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.12, duration: 0.32 }}
                    >
                      <span className="text-2xl flex-shrink-0">{badge.emoji}</span>
                      <div className="text-left">
                        <p className="text-white/90 text-sm font-bold leading-tight">{badge.name}</p>
                        <p className="text-white/40 text-xs">{badge.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```
Expected: `✓ built in Xms` with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/BurbuTap.tsx
git commit -m "feat: show tier and earned badges on end screen"
```

---

## Task 5: Add tier to `LandingPage.tsx` global leaderboard

**Files:**
- Modify: `src/components/LandingPage.tsx`

- [ ] **Step 1: Add import**

Find at the top of `LandingPage.tsx`:
```typescript
import { useLeaderboard } from '../hooks/useLeaderboard';
```

Add immediately after:
```typescript
import { getTier } from '../utils/tiers';
```

- [ ] **Step 2: Add tier to top-1 hero card**

Find the right-side div of the hero card:
```tsx
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-postobon-red font-bold text-xl font-mono tabular-nums">
                      <AnimatedScore value={entries[0].score} />
                    </p>
                    <p className="text-white/30 text-[9px]">pts</p>
                  </div>
```

Replace with:
```tsx
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-postobon-red font-bold text-xl font-mono tabular-nums">
                      <AnimatedScore value={entries[0].score} />
                    </p>
                    <p className="text-white/30 text-[9px]">pts</p>
                    <p className="text-white/40 text-[9px] mt-0.5">
                      {getTier(entries[0].score).title} {getTier(entries[0].score).emoji}
                    </p>
                  </div>
```

- [ ] **Step 3: Add tier to rest of ranking entries**

Find the right side of each entry in `entries.slice(1, 10).map(...)`:
```tsx
                    <span className="text-white/80 font-bold text-sm font-mono tabular-nums flex-shrink-0 ml-3">{entry.score.toLocaleString()}</span>
```

Replace with:
```tsx
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-white/80 font-bold text-sm font-mono tabular-nums">{entry.score.toLocaleString()}</p>
                      <p className="text-white/35 text-[9px]">{getTier(entry.score).title} {getTier(entry.score).emoji}</p>
                    </div>
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```
Expected: `✓ built in Xms` with no TypeScript errors.

- [ ] **Step 5: Commit and push**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat: show tier in landing page global leaderboard"
git push
```

---

## Verification Checklist

After all tasks complete, manually verify:

- [ ] Landing page: each ranking entry shows `Score · Tier Emoji` (e.g. `8.240 · Campeón Postobón 🏆`)
- [ ] End screen: tier label appears below the big score number
- [ ] End screen: badges section appears with emoji, name, and description per badge
- [ ] End screen leaderboard: tier shown under each score
- [ ] Playing without hitting any bomb → 🥷 Ninja badge
- [ ] Activating Frenzy mode → 🔥 En llamas badge
- [ ] Build has zero TypeScript errors
