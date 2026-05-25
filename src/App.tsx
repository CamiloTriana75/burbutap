import BurbuTap from './components/BurbuTap';

export default function App() {
  return <BurbuTap onClose={() => window.history.back()} />;
}
