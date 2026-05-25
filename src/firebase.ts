import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Rellena estos valores con tu proyecto de Firebase
// (los obtienes en console.firebase.google.com → Configuración del proyecto)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             as string,
};

export const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
