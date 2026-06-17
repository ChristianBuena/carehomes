"use client";

import { useState, useEffect } from "react";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  membership: {
    id: string;
    status: string;
    plan: string;
    // Comes as ISO string from JSON — not a Date object
    nextBillingDate: string | null;
  } | null;
};

const CACHE_KEY = "auth_user_cache";

function readCache(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeCache(user: AuthUser) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(user));
  } catch {
    // ignore (private browsing, quota exceeded)
  }
}

function clearCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 1. Instantly use cache on mount to prevent long loading flash
    const cached = readCache();
    if (cached) {
      setUser(cached);
      setIsAuthenticated(true);
      setLoading(false);
    }

    // 2. Re-validate with the server in the background
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (cancelled) return;

        if (res.ok) {
          const data: AuthUser = await res.json();
          setUser(data);
          setIsAuthenticated(true);
          writeCache(data);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          clearCache();
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setIsAuthenticated(false);
          clearCache();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading, isAuthenticated };
}
