import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// BARU: Import Authentication
import { getAuth, GoogleAuthProvider } from "firebase/auth"; 

const firebaseConfig = {
  apiKey: "AIzaSyD9s8k-o_PeZ7o743rVmx-L_IHQAuGzAhs",
  authDomain: "kabarpintar-db.firebaseapp.com",
  projectId: "kabarpintar-db",
  storageBucket: "kabarpintar-db.firebasestorage.app",
  messagingSenderId: "678148068972",
  appId: "1:678148068972:web:e4d580be5dbd57363eea49"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// BARU: Inisialisasi Auth & Google Provider
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();