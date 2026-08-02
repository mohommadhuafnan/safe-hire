import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBejVpQ8sQj2LVwedFBtyOw8aGyyp3CchE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "safe-hire.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "safe-hire",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "safe-hire.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "265652900571",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:265652900571:web:b128f6e9cfa76e741ab2fe",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-6J0NPVBZHB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return {
      user: result.user,
      idToken: idToken,
      email: result.user.email,
      fullName: result.user.displayName
    };
  } catch (error) {
    console.error("Firebase Google Sign-In notice:", error);
    throw error;
  }
};
