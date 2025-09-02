
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBd_ODcBhUbiLkQ-GBgemIlDkGZDQ4IcFw",
  authDomain: "epi-ca-inspector.firebaseapp.com",
  projectId: "epi-ca-inspector",
  storageBucket: "epi-ca-inspector.firebasestorage.app",
  messagingSenderId: "88060391632",
  appId: "1:88060391632:web:c54fdfc7fa5ae70dce6ed5",
  measurementId: "G-CPQMVKMNFX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
