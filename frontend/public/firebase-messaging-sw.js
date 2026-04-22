importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// La config Firebase est passée en paramètres d'URL depuis fcmHelper.js
const params = new URL(location.href).searchParams;

if (params.get('apiKey')) {
  firebase.initializeApp({
    apiKey: params.get('apiKey'),
    authDomain: params.get('authDomain'),
    projectId: params.get('projectId'),
    storageBucket: params.get('storageBucket'),
    messagingSenderId: params.get('messagingSenderId'),
    appId: params.get('appId')
  });

  const messaging = firebase.messaging();

  // Affiche la notification quand l'app est en arrière-plan ou fermée
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'Fidelyz';
    const body = payload.notification?.body || '';

    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    });
  });
}
