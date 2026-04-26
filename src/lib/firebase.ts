import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBSGTKK4PFqs-5k-F-rblJvzrWL80E1DHw",
  authDomain: "ny11-d38d1.firebaseapp.com",
  projectId: "ny11-d38d1",
  storageBucket: "ny11-d38d1.firebasestorage.app",
  messagingSenderId: "1067554930031",
  appId: "1:1067554930031:web:da49460b3c1ef838a0fc9a",
  measurementId: "G-LJ4XL03QKF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
