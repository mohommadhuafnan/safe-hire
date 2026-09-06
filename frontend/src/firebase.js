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
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "265652900571-3h8550irekkntpluu4ccbi2d6m6oojl3.apps.googleusercontent.com";

// Ensure Google Identity Services script is loaded
export const loadGoogleScript = () => {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) {
      resolve(window.google.accounts.oauth2);
      return;
    }
    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google?.accounts?.oauth2));
      setTimeout(() => resolve(window.google?.accounts?.oauth2 || null), 1500);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google?.accounts?.oauth2);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
};

// Direct Google OAuth Authentication (Works on Desktop & Mobile Safari without Firebase console lockouts)
export const signInWithGoogleDirect = async () => {
  const oauth2 = await loadGoogleScript();
  if (!oauth2) {
    throw new Error("Unable to load Google Identity Services.");
  }

  return new Promise((resolve, reject) => {
    try {
      const client = oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "email profile openid",
        prompt: "select_account",
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            if (!userInfoRes.ok) {
              throw new Error("Failed to fetch Google profile information.");
            }
            const profile = await userInfoRes.json();
            if (!profile.email) {
              throw new Error("No verified email received from Google.");
            }

            // Create compatible token payload for backend verification
            const payload = {
              email: profile.email,
              name: profile.name || profile.email.split('@')[0],
              sub: profile.sub,
              picture: profile.picture,
              auth_time: Math.floor(Date.now() / 1000)
            };
            const jsonStr = JSON.stringify(payload);
            const b64Payload = btoa(unescape(encodeURIComponent(jsonStr)));
            const idToken = `gsi.${b64Payload}.direct`;

            resolve({
              idToken: idToken,
              email: profile.email,
              fullName: profile.name || profile.email.split('@')[0]
            });
          } catch (err) {
            reject(err);
          }
        },
        error_callback: (err) => {
          reject(new Error(err?.message || "Google sign-in popup was cancelled."));
        }
      });
      client.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
};

// Unified Sign In With Google: Tries direct Google Identity Services first, with graceful Firebase fallback
export const signInWithGoogle = async () => {
  try {
    const directResult = await signInWithGoogleDirect();
    if (directResult && directResult.email) {
      return directResult;
    }
  } catch (gsiErr) {
    console.warn("Direct Google sign-in note, attempting Firebase Auth fallback:", gsiErr);
    // If user cancelled, don't trigger secondary popup
    if (gsiErr.message && (gsiErr.message.includes('cancelled') || gsiErr.message.includes('closed') || gsiErr.message.includes('popup_closed'))) {
      throw gsiErr;
    }
  }

  // Fallback to standard Firebase signInWithPopup
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return {
      user: result.user,
      idToken: idToken,
      email: result.user.email,
      fullName: result.user.displayName || result.user.email.split('@')[0]
    };
  } catch (error) {
    console.error("Firebase Google Sign-In notice:", error);
    throw error;
  }
};
