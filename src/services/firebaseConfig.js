import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDEMK2XqsW8BrrfHUHRUmWaCFOGoKITAMk",
  authDomain: "gbm-d2711.firebaseapp.com",
  projectId: "gbm-d2711",
  storageBucket: "gbm-d2711.firebasestorage.app",
  messagingSenderId: "473337713225",
  appId: "1:473337713225:web:2d4e964e37f8500cf5a598"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
