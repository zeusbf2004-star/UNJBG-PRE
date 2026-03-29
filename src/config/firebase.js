import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
export default app;
