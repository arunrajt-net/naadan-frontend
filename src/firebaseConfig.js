import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBVE5ktWitSqetZZZoCfqMqE74Rpks6O_8",
  authDomain: "naadan-ebd6e.firebaseapp.com",
  projectId: "naadan-ebd6e",
  storageBucket: "naadan-ebd6e.firebasestorage.app",
  messagingSenderId: "159323847568",
  appId: "1:159323847568:web:bcdda6cf1bb9b3b268d115",
  measurementId: "G-FQ5LB7TJ5X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
