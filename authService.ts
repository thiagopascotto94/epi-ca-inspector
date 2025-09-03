import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth } from "./firebase";

export class AuthService {
  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  static async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  }

  static async register(email: string, password: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Erro no registro:", error);
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro no logout:", error);
      throw error;
    }
  }

  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  static isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }
}
