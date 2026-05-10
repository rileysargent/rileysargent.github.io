import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
    getFirestore, collection, addDoc, onSnapshot, query, orderBy,
    serverTimestamp, limit, where, getDocs, doc, setDoc, updateDoc,
    arrayUnion, arrayRemove, getDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
    getDatabase, ref, onValue, set, onDisconnect, remove
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import {
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
    onAuthStateChanged, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCr2mG-lVDHFwW4fTAx7_5AwZX2jJ8myrw",
    authDomain: "hyperspace-r.firebaseapp.com",
    databaseURL: "https://hyperspace-r-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "hyperspace-r",
    storageBucket: "hyperspace-r.firebasestorage.app",
    messagingSenderId: "1050495683444",
    appId: "1:1050495683444:web:846c42d274197b20313a21"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const auth = getAuth(app);

export {
    db, rtdb, auth,
    collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, limit,
    where, getDocs, doc, setDoc, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc,
    ref, onValue, set, onDisconnect, remove,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged,
    signOut, updateProfile
};
