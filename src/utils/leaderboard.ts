import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

const DEVICES_COL = 'burbutap_devices';
const DEVICE_ID_KEY = 'burbutap_device_id';

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Marca este dispositivo como "ya jugó" en Firestore. */
export async function registerDevice(deviceId: string): Promise<void> {
  await setDoc(doc(db, DEVICES_COL, deviceId), { playedAt: serverTimestamp() });
}

/** Devuelve true si el dispositivo tiene registro en Firestore. */
export async function checkDevice(deviceId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, DEVICES_COL, deviceId));
  return snap.exists();
}

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
