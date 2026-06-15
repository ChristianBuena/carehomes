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
    nextBillingDate: Date | null;
  } | null;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data: AuthUser = await res.json();
          setUser(data);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  return { user, loading, isAuthenticated };
}
