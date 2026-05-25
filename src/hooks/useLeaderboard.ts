import { useState, useEffect } from 'react';
import { subscribeLeaderboard } from '../utils/leaderboard';
import type { ScoreEntry } from '../utils/leaderboard';

interface Result {
  entries: ScoreEntry[];
  loading: boolean;
  error:   boolean;
}

export function useLeaderboard(): Result {
  const [entries, setEntries] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState(false);

  useEffect(() => {
    const unsub = subscribeLeaderboard(
      data => { setEntries(data); setLoading(false); setError(false); },
      ()   => { setLoading(false); setError(true); },
    );
    return unsub;
  }, []);

  return { entries, loading, error };
}
