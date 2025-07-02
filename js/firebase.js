import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBG7Kh0K_NlSEy4lTywtR4Ziky5kQSiELM",
  authDomain: "jdofirebase.firebaseapp.com",
  projectId: "jdofirebase",
  storageBucket: "jdofirebase.firebasestorage.app",
  messagingSenderId: "645079937368",
  appId: "1:645079937368:web:e690f4d3852d032cfc752d",
  measurementId: "G-S38JN11WEC"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const provider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signOutGoogle() {
  return signOut(auth);
}

export function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}

export function createRoomLink(user) {
  const roomName = `room-${user.uid}-${Date.now()}`;
  return `https://vdo.ninja/?room=${roomName}`;
} 