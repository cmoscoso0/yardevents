import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBKNRU6s6Iq1r41F9iG91NY2CqmADJN_BI",
  authDomain: "yard-events.firebaseapp.com",
  projectId: "yard-events",
  storageBucket: "yard-events.firebasestorage.app",
  messagingSenderId: "1008161692342",
  appId: "1:1008161692342:web:434d2942b43ad249326417",
  measurementId: "G-5M1XH8RQCY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
