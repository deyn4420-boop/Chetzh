"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

const TOKEN_STORAGE_KEY = "chat_token";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On first load, check localStorage for a token and resolve who it
  // belongs to via /auth/me - if that fails (expired, tampered), fall
  // back to a logged-out state.
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);

    // Both branches (no token at all, vs. a token that needs verifying)
    // resolve through the same promise chain, so setIsLoading only ever
    // fires inside .finally() rather than as a bare statement in the
    // effect body - keeps the "no token" case from rendering twice.
    const verify = stored
      ? fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/auth/me`, {
          headers: { Authorization: `Bearer ${stored}` },
        })
          .then((res) => {
            if (!res.ok) throw new Error("Invalid session");
            return res.json();
          })
          .then((userData: User) => {
            setUser(userData);
            setToken(stored);
          })
          .catch(() => {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          })
      : Promise.resolve();

    verify.finally(() => setIsLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const { access_token } = await api.login(username, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, access_token);
    setToken(access_token);

    const me = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/auth/me`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    ).then((r) => r.json());
    setUser(me);

    router.push("/chat");
  }

  async function register(username: string, email: string, password: string) {
    await api.register(username, email, password);
    // Registration doesn't log the user in automatically - keeps the
    // endpoint simple and makes "account created, now sign in" explicit.
    await login(username, password);
  }

  function logout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setToken(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export { ApiError };
