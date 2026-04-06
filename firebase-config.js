// firebase-config.js

// ==========================================
// THE MASTER SWITCH
// Comment out DEV and uncomment PROD before deploying!
// ==========================================
import { devConfig as activeConfig } from "./firebase-config.dev.js";
// import { prodConfig as activeConfig } from "./firebase-config.prod.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getMessaging, isSupported } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

// Initialize Firebase using the active config
export const app = initializeApp(activeConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable Offline Persistence for Enterprise PWA
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn("Multiple tabs open, offline mode disabled.");
  } else if (err.code == 'unimplemented') {
    console.warn("Browser doesn't support offline persistence.");
  }
});

// Safe Messaging Init
export let messaging = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});