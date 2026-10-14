import { createContext, useContext, useState, type ReactNode } from "react";
import type { User, AuthState } from "../types/movie.types.ts";

interface AuthContextValue extends AuthState {
  login:      (token: string, user: User) => void;
  logout:     () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "cv_token";
const USER_KEY  = "cv_user";

function getInitialState(): AuthState {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw   = localStorage.getItem(USER_KEY);
    if (token && raw) {
      return { user: JSON.parse(raw) as User, token, loading: false };
    }
  } catch {
    // If parsing fails, clear potentially corrupted data
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  return { user: null, token: null, loading: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(getInitialState);

  const login = (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({ user, token, loading: false });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ user: null, token: null, loading: false });
  };

  const updateUser = (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState(s => ({ ...s, user }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}