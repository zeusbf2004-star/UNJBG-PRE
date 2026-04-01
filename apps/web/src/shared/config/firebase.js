import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBGRCyWH_QOF1eYYirhA_joMr5UYjRNRaE",
    authDomain: "unjbg-prep.firebaseapp.com",
    projectId: "unjbg-prep",
    storageBucket: "unjbg-prep.firebasestorage.app",
    messagingSenderId: "861956339937",
    appId: "1:861956339937:web:c21a36926e9f7966975fa0",
    measurementId: "G-PDDS7PF1RH"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Sincroniza el perfil del usuario autenticado con la colección 'users'.
 * Usa merge: true para no borrar campos como 'role'.
 */
export const syncUserProfile = async (user) => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp()
    }, { merge: true });
};

export default app;
