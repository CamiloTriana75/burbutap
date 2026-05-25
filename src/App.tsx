import { useState } from 'react';
import LandingPage from './components/LandingPage';
import BurbuTap from './components/BurbuTap';

export default function App() {
  const [playing, setPlaying] = useState(false);

  if (playing) return <BurbuTap onClose={() => setPlaying(false)} />;
  return <LandingPage onPlay={() => setPlaying(true)} />;
}
