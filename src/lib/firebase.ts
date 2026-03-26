import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAtvFcWzw4ScNxqTsuwWv-WWrj_ZWt9exI",
  authDomain: "bible-website-81bee.firebaseapp.com",
  projectId: "bible-website-81bee",
  storageBucket: "bible-website-81bee.firebasestorage.app",
  messagingSenderId: "340062947638",
  appId: "1:340062947638:web:86370a1490a9e0ab3ecb97",
  measurementId: "G-0B37FS14N8"
};

// Initialize Firebase (SSR friendly)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
