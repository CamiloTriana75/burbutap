import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface ScoreEntry {
  name:  string;
  score: number;
}

const COL = 'burbutap_scores';

/** Guarda un score en Firestore. Lanza error si falla. */
export async function addScore(entry: ScoreEntry): Promise<void> {
  await addDoc(collection(db, COL), {
    name:      entry.name,
    score:     entry.score,
    createdAt: serverTimestamp(),
  });
}

/**
 * Suscripción en tiempo real al top 10.
 * Llama a `onData` cada vez que cambia el ranking.
 * Devuelve función para cancelar la suscripción.
 */
export function subscribeLeaderboard(
  onData:  (entries: ScoreEntry[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, COL),
    orderBy('score', 'desc'),
    limit(10),
  );
  return onSnapshot(
    q,
    snap => onData(snap.docs.map(d => ({ name: d.data().name as string, score: d.data().score as number }))),
    onError,
  );
}
