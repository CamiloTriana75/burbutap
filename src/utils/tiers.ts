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
