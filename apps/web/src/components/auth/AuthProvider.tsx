"use client";

import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import { UserSession } from "@/lib/types";
import { readCachedUser, writeCachedUser } from "@/lib/sessionCache";
import { useRouter } from "next/navigation";

interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserSession | null;
}

interface AuthContextType {
  user: UserSession | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, name: string, role?: "attendee" | "organizer") => Promise<AuthResult>;
  logout: () => void;
  /** Re-fetches /api/v1/auth/me and updates the cached user — call after any
   * change made directly against the backend (e.g. updating the account name)
   * so the rest of the app (navbar, etc.) reflects it without a full reload. */
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ success: false, error: "Not ready" }),
  signup: async () => ({ success: false, error: "Not ready" }),
  logout: () => {},
  refreshUser: async () => {},
  isLoading: true,
});

async function postAuth(path: "login" | "signup", body: unknown): Promise<{ user: UserSession | null; error?: string }> {
  try {
    const res = await fetch(`/api/v1/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return { user: null, error: data.error || "Something went wrong" };
    }
    return { user: data.user };
  } catch {
    return { user: null, error: "Network error. Please try again." };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Paint the cached session before the browser draws (no "Sign in" flash),
  // then revalidate against the server below. SSR/first render stay null, so
  // there is no hydration mismatch.
  useLayoutEffect(() => {
    const cached = readCachedUser();
    if (cached) {
      // Intentional pre-paint hydration from external storage: setting state
      // here is exactly what prevents the signed-out flash; /me revalidates.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(cached);
      setIsLoading(false);
    }
  }, []);

  // Stale-while-revalidate: the server copy always wins; a 401 clears the
  // cache, while network/backend failures keep the cached session alive so
  // the app stays usable offline instead of signing the user out visually.
  const fetchMe = () =>
    fetch("/api/v1/auth/me", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          setUser(null);
          writeCachedUser(null);
          return;
        }
        if (!r.ok) return; // 502 etc.: keep the cached session
        const data = await r.json();
        const next = (data.user as UserSession | null) || null;
        setUser(next);
        writeCachedUser(next);
      })
      .catch(() => {
        // Offline: keep the cached session; it revalidates on the next mount.
      });

  useEffect(() => {
    fetch("/api/v1/auth/me", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          setUser(null);
          writeCachedUser(null);
          return;
        }
        if (!r.ok) return;
        const data = await r.json();
        const next = (data.user as UserSession | null) || null;
        setUser(next);
        writeCachedUser(next);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const refreshUser = async () => {
    await fetchMe();
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const { user: loggedIn, error } = await postAuth("login", { email, password });
    if (!loggedIn) return { success: false, error };
    setUser(loggedIn);
    writeCachedUser(loggedIn);
    router.refresh();
    return { success: true, user: loggedIn };
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: "attendee" | "organizer" = "attendee"
  ): Promise<AuthResult> => {
    const { user: created, error } = await postAuth("signup", { email, password, name, role });
    if (!created) return { success: false, error };
    setUser(created);
    writeCachedUser(created);
    router.refresh();
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    writeCachedUser(null);
    fetch("/api/v1/auth/logout", { method: "POST" }).finally(() => {
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
