import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
const firebaseConfig = {

  apiKey: "AIzaSyAoH30IvbSA4yhKWPwRpxPejawoJuZowFQ",

  authDomain: "tata-4e92a.firebaseapp.com",

  projectId: "tata-4e92a",

  storageBucket: "tata-4e92a.firebasestorage.app",

  messagingSenderId: "1051973853262",

  appId: "1:1051973853262:web:d02e682e9321556c7ea31f",

  measurementId: "G-P9MKB2ENVR"

};
const app=initializeApp(firebaseConfig); export const auth=getAuth(app); export const db=getFirestore(app);
