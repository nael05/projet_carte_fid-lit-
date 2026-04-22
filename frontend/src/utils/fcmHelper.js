import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

function isConfigured() {
  return !!import.meta.env.VITE_FIREBASE_API_KEY;
}

function getFirebaseMessaging() {
  if (!isConfigured()) return null;
  const existing = getApps().find(a => a.name === 'fidelyz-client');
  const app = existing || initializeApp(firebaseConfig, 'fidelyz-client');
  return getMessaging(app);
}

/**
 * Demande la permission de notification et retourne le token FCM.
 * Retourne null si refusé, non supporté, ou Firebase non configuré.
 */
export async function requestFCMToken() {
  try {
    if (!isConfigured()) return null;
    if (!('Notification' in window)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = getFirebaseMessaging();
    if (!messaging) return null;

    // Construit l'URL du SW avec la config Firebase en paramètres (la config web Firebase n'est pas secrète)
    const swParams = new URLSearchParams({
      apiKey: firebaseConfig.apiKey || '',
      authDomain: firebaseConfig.authDomain || '',
      projectId: firebaseConfig.projectId || '',
      storageBucket: firebaseConfig.storageBucket || '',
      messagingSenderId: firebaseConfig.messagingSenderId || '',
      appId: firebaseConfig.appId || ''
    });

    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${swParams.toString()}`
    );

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    return token || null;
  } catch (err) {
    console.warn('[FCM] Impossible d\'obtenir le token:', err.message);
    return null;
  }
}

/**
 * Écoute les messages FCM quand l'app est au premier plan.
 * Retourne une fonction de désinscription.
 */
export function listenForegroundMessages(callback) {
  const messaging = getFirebaseMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
