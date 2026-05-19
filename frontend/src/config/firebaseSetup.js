import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const privateConfig = {
  apiKey: "AIzaSyCrJuqwUykOSLyAM8I7Wse90t46QJ5HQOg",
  authDomain: "sid-bank-private.firebaseapp.com",
  projectId: "sid-bank-private",
  storageBucket: "sid-bank-private.firebasestorage.app",
  messagingSenderId: "140386892138",
  appId: "1:140386892138:web:daf17e3bfe3ec0a320cd13",
  measurementId: "G-KYPN7HE5G2"
};

// Named "private" so it doesn't clash with the hub app
const privateApp = getApps().find(a => a.name === "private")
  ?? initializeApp(privateConfig, "private");

export const db = getFirestore(privateApp);