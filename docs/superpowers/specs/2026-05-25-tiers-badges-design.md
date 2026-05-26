# Tiers & Badges — Diseño

## Objetivo
Agregar narrativa y progresión al juego Burbu-Tap: 7 niveles de jugador basados en score que aparecen en el ranking global, y hasta 3 badges personales revelados al terminar la partida con explicación de cómo se ganaron.

## Arquitectura

**Enfoque:** Todo client-side. El tier se calcula del score con una función pura. Los badges se rastrean con refs durante el gameplay. Cero cambios en el esquema de Firestore.

**Archivos a crear:**
- `src/utils/tiers.ts`

**Archivos a modificar:**
- `src/components/BurbuTap.tsx`
- `src/components/LandingPage.tsx`

---

## Tiers (7 niveles)

| # | Rango de score | Título | Emoji |
|---|---------------|--------|-------|
| 1 | 0 – 999 | Comenzando | 🫧 |
| 2 | 1.000 – 2.499 | Aprendiz | 🌱 |
| 3 | 2.500 – 4.499 | Taponero | 💪 |
| 4 | 4.500 – 6.499 | Ardiente | 🔥 |
| 5 | 6.500 – 7.499 | Casi... | ⚡ |
| 6 | 7.500 – 9.999 | Campeón Postobón | 🏆 |
| 7 | 10.000+ | Leyenda | 👑 |

`getTier(score)` devuelve `{ title: string, emoji: string }`.

---

## Badges (8 posibles, máx. 3 mostrados al final)

Cada badge tiene: emoji, nombre, descripción corta visible al jugador.

| Badge | Emoji | Descripción visible |
|-------|-------|---------------------|
| Ninja | 🥷 | No tocaste ninguna bomba |
| Polar | ❄️ | Usaste 3 burbujas de hielo |
| Cazador | ⭐ | Tocaste 5 burbujas doradas |
| En llamas | 🔥 | Activaste el Modo Frenesí |
| Puntería | 🎯 | Menos de 5 misses en la partida |
| Imparable | ⚡ | Alcanzaste combo x15 o más |
| Veloz | 💨 | 3.000 pts en los primeros 20 segundos |
| Perfección | 👑 | Terminaste con combo activo |

**Prioridad de selección:** Si el jugador gana más de 3, se muestran los 3 más difíciles de obtener (orden descendente de rareza: Perfección > Imparable > Ninja > Cazador > Veloz > Polar > En llamas > Puntería).

### Stats rastreadas durante el juego (refs)

| Ref | Tipo | Qué mide |
|-----|------|----------|
| `bombsHitRef` | `number` | Cuántas bombas tocó |
| `iceUsedRef` | `number` | Cuántas burbujas de hielo tocó |
| `goldHitRef` | `number` | Cuántas burbujas doradas tocó |
| `frenzyActivatedRef` | `boolean` | Si activó Modo Frenesí |
| `missCountRef` | `number` | Total de misses (fondo + burbujas expiradas) |
| `maxComboRef` | `number` | Combo más alto alcanzado |
| `scoreAt20sRef` | `number` | Score cuando llevaba 20 s jugados |
| `endComboRef` | `number` | Combo al momento de terminar el juego |

Todos se resetean en `startGame()`.

---

## End Screen — sección de badges

Aparece después del score y antes del fun fact, solo si el jugador ganó ≥ 1 badge.

```
┌─────────────────────────────────────┐
│  🥷 Ninja                           │
│  No tocaste ninguna bomba           │
│                                     │
│  ⚡ Imparable                        │
│  Alcanzaste combo x15 o más         │
│                                     │
│  🔥 En llamas                        │
│  Activaste el Modo Frenesí          │
└─────────────────────────────────────┘
```

Cada badge entra con animación `initial={{ opacity:0, y:12 }}` con delay escalonado (0, 0.12, 0.24 s).

---

## Ranking global — tier en cada entrada

Formato en leaderboard (BurbuTap end screen + LandingPage):

```
🥇  Camilo     8.240 pts  · Campeón 🏆
🥈  Andrea     7.100 pts  · Casi... ⚡
🥉  Luis       3.200 pts  · Taponero 💪
 4  María      1.800 pts  · Aprendiz 🌱
```

El tier va en la misma línea que el score, separado por ` · `, con texto `text-white/40 text-xs`.

---

## Flujo de datos

```
startGame()
  → reset todos los stat refs

durante gameplay
  → tapBubble() / handleBgTap() → incrementan refs correspondientes
  → frenzy activado → frenzyActivatedRef = true
  → combo actualizado → maxComboRef = max(maxComboRef, newCombo)
  → tick() a los 20s → scoreAt20sRef = scoreRef.current

endGame()
  → endComboRef = comboRef.current
  → evalBadges(stats) → array de badges ganados (máx. 3)
  → setEarnedBadges(badges)
  → setFinalScore(s)
  → phase = 'end'

render end screen
  → getTier(finalScore) → muestra tier bajo el score
  → earnedBadges.map() → muestra cards con emoji + título + descripción
```

---

## Archivos — cambios exactos

### `src/utils/tiers.ts` (nuevo)
Exporta:
- `getTier(score: number): { title: string; emoji: string }`
- `getBadges(stats: BadgeStats): BadgeResult[]` donde `BadgeResult = { emoji, name, desc }`
- `type BadgeStats` con todos los campos de las 8 stats

### `src/components/BurbuTap.tsx`
- Agregar 8 refs de stats
- Resetear en `startGame()`
- Incrementar en `tapBubble()`, `handleBgTap()`, `endGame()`, y en el efecto frenzy
- Capturar `scoreAt20sRef` en el tick a los 20 s
- Agregar estado `earnedBadges: BadgeResult[]`
- Llamar `getBadges()` en `endGame()`
- Agregar sección de badges en el JSX de la fase `end`
- Agregar `getTier(entry.score)` en `LeaderboardPanel` para cada entrada

### `src/components/LandingPage.tsx`
- Agregar `getTier(entry.score)` en la lista del ranking global

---

## Restricciones

- Sin cambios en Firestore — tier y badges son puramente client-side
- `BurbuTap.tsx` ya es grande; las stat refs se agrupan claramente con un comentario de sección
- Máximo 3 badges mostrados para no saturar la pantalla
