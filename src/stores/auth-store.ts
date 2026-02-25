import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  image?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  _initialized: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<AuthUser>) => void;
  initAuth: () => Promise<void>;
}

let _initPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      _initialized: false,

      setAuth: (user, token) => {
        set({ user, token });
      },

      logout: () => {
        set({ user: null, token: null });
      },

      updateUser: (data) => {
        const current = get().user;
        if (current) {
          set({ user: { ...current, ...data } });
        }
      },

      initAuth: async () => {
        if (get()._initialized) return;

        // Deduplicate concurrent calls
        if (_initPromise) return _initPromise;

        _initPromise = (async () => {
          try {
            const res = await fetch("/api/auth/me");
            if (res.ok) {
              const json = await res.json();
              set({ user: json.data, _initialized: true });
            } else {
              set({ user: null, token: null, _initialized: true });
            }
          } catch {
            set({ _initialized: true });
          } finally {
            _initPromise = null;
          }
        })();

        return _initPromise;
      },
    }),
    {
      name: "fofurinhas-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
