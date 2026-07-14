import { initializeApp } from "firebase/app";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyAgNPUr-yRtR3r8qu9ipnG3809tU_b9mLI",
  authDomain: "yanbal-inventory.firebaseapp.com",
  projectId: "yanbal-inventory",
  storageBucket: "yanbal-inventory.firebasestorage.app",
  messagingSenderId: "450787023201",
  appId: "1:450787023201:web:e8a5bafee8db6a67104d20",
  measurementId: "G-699CF9QQ96"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase App Check with reCAPTCHA v3
export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LdiWFItAAAAAJ3fRZ5j9LRjn0_PksxzqXNwESWE'),
  isTokenAutoRefreshEnabled: true
});

// Initialize Cloud Firestore and Cloud Storage and Auth
export const db = getFirestore(app);

enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn("Firebase offline persistence failed: Multiple tabs open.");
  } else if (err.code == 'unimplemented') {
    console.warn("Firebase offline persistence is not supported in this browser.");
  }
});
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
