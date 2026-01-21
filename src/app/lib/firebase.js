// src/lib/firebase.js

// Importe les fonctions dont on a besoin
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Ta configuration (copie ça depuis la console Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyAev7tjPU3bdWlLYLwG8o3Day4az_8CPxc",
  authDomain: "swtor-map.firebaseapp.com",
  projectId: "swtor-map",
  storageBucket: "swtor-map.firebasestorage.app",
  messagingSenderId: "12987942242",
  appId: "1:12987942242:web:56b1154bb962404cf1983b"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);

// On exporte ces outils pour les utiliser ailleurs dans le site
export const db = getFirestore(app); // La base de données
export const auth = getAuth(app);    // L'authentification