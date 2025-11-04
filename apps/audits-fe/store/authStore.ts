// frontend/store/authStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// We define the AppUser interface with all the properties we expect from Auth0 and our backend.
export interface AppUser {
  // Standard fields from Auth0
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  sub?: string; // This is the unique Auth0 user ID

  // Custom fields from our MongoDB
  role?: 'admin' | 'inspector' | 'manager' | 'employee';
  fullName?: string;
  _id?: string; // The MongoDB document ID
  stores?: string[]; // --- התיקון כאן ---
}

// הגדרת מבנה ה-State של ה-Store
interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  iframeToken: string | null;
  setIframeToken: (token: string) => void;
  fetchUser: () => Promise<void>;
  logoutUser: () => void;
}

const useAuthStore = create<AuthState>()(
  devtools((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    iframeToken: null,

    /**
     * Set token received from parent frame
     */
    setIframeToken: (token: string) => {
      console.log('✅ Token received from parent frame');
      set({ iframeToken: token });
      // Trigger user fetch with new token
      get().fetchUser();
    },

    /**
     * פונקציה זו פונה לנקודת הקצה שלנו /api/auth/me
     * נקודת הקצה הזו מאמתת את המשתמש מול Auth0 ומחזירה את פרטי המשתמש המלאים מה-DB שלנו (כולל התפקיד)
     */
    fetchUser: async () => {
      if (get().user) {
        set({ isLoading: false });
        return;
      }
      
      set({ isLoading: true, error: null });

      try {
        const token = get().iframeToken;
        const headers: HeadersInit = {};
        
        // If we have a token from parent frame, use it
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/auth/me', { headers });

        if (res.status === 401) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }
        
        if (!res.ok) {
           const errorData = await res.json();
           throw new Error(errorData.error || 'Failed to fetch user profile');
        }

        const userData: AppUser = await res.json();
        set({
          user: userData,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error: any) {
        console.error('Error fetching user:', error.message);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: error.message,
        });
      }
    },

    /**
     * פונקציה זו מנקה את פרטי המשתמש מה-State המקומי של האפליקציה.
     * נקרא לה לפני שנעבור לכתובת היציאה של Auth0.
     */
    logoutUser: () => {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    },
  }))
);

export default useAuthStore;