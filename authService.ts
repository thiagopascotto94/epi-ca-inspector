import { 
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  User as FirebaseUser
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { api, setToken, removeToken, getFirebaseIdToken, getToken } from './services/localApiService';
import { LoginCredentials, User, AuthResponse } from '../types';

export class AuthService {
  static onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  static async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response: AuthResponse = await api.post('/auth/login', credentials);
      if (response.token) {
        setToken(response.token);
        // Assuming the API returns user info along with the token
        // This part may need adjustment based on the actual API response
        const user = this.decodeToken(response.token);
        return user;
      }
      throw new Error("Login failed: No token received");
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  }

  static async loginWithGoogle(): Promise<User> {
    try {
      await signInWithPopup(auth, googleProvider);
      const idToken = await getFirebaseIdToken();
      if (!idToken) throw new Error("Could not get Firebase ID token.");

      const response: AuthResponse = await api.post('/auth/social-login', { idToken });

      if (response.token) {
        setToken(response.token);
        const user = this.decodeToken(response.token);
        return user;
      }
      throw new Error("Google login failed: No token received from local API");
    } catch (error) {
      console.error("Erro no login com o Google:", error);
      // If local API login fails, sign out from Firebase to be safe
      await signOut(auth);
      removeToken();
      throw error;
    }
  }

  static async register(credentials: LoginCredentials): Promise<any> {
    try {
      // The server register endpoint doesn't log the user in, just creates the user
      return await api.post('/auth/register', credentials);
    } catch (error) {
      console.error("Erro no registro:", error);
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      await signOut(auth); // Sign out from Firebase
      removeToken(); // Remove local JWT
    } catch (error) {
      console.error("Erro no logout:", error);
      // Still remove local token even if firebase signout fails
      removeToken();
      throw error;
    }
  }

  static getCurrentUser(): FirebaseUser | null {
    // This still refers to the Firebase user object
    return auth.currentUser;
  }

  static isAuthenticated(): boolean {
    // The primary source of truth for app authentication should be the local JWT
    return getToken() !== null;
  }

  static async requestPasswordReset(email: string): Promise<void> {
    try {
      await api.post('/auth/request-password-reset', { email });
    } catch (error) {
      console.error("Erro ao solicitar redefinição de senha:", error);
      throw error;
    }
  }

  static async resetPassword(password: string, token: string): Promise<void> {
    try {
      await api.post('/auth/reset-password', { password, token });
    } catch (error) {
        console.error("Erro ao redefinir a senha:", error);
        throw error;
    }
  }

  static decodeToken(token: string): User {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            id: payload.id,
            email: payload.email,
            role: payload.role,
        };
    } catch (error) {
        console.error("Failed to decode token:", error);
        throw new Error("Invalid token");
    }
  }
}
