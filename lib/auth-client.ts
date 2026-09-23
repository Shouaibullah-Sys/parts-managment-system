"use client";

import { useState, useEffect, useCallback } from "react";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  image: string | null;
}

interface SessionState {
  data: { user: SessionUser } | null;
  isPending: boolean;
}

export interface SessionResult {
  data: { user: SessionUser } | null;
  /** true when the session could not be determined due to a network/server error (NOT a definitive logout) */
  failed?: boolean;
}

let cachedSession: SessionState | null = null;
let listeners: Array<() => void> = [];
let inFlightSession: Promise<SessionResult> | null = null;

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSessionOnce(): Promise<SessionResult> {
  try {
    const res = await fetch("/api/auth/session", { credentials: "include" });

    if (res.status === 401) {
      cachedSession = { data: null, isPending: false };
      notifyListeners();
      return { data: null };
    }

    if (!res.ok) {
      return { data: null, failed: true };
    }

    const data = await res.json();
    cachedSession = { data, isPending: false };
    notifyListeners();
    return { data };
  } catch {
    return { data: null, failed: true };
  }
}

async function loadSession(): Promise<SessionResult> {
  let result = await fetchSessionOnce();

  if (result.failed) {
    await sleep(300);
    result = await fetchSessionOnce();
  }

  if (result.failed) {
    if (cachedSession?.data) {
      return { data: cachedSession.data };
    }
    return { data: null, failed: true };
  }

  return result;
}

function getSession(): Promise<SessionResult> {
  if (!inFlightSession) {
    inFlightSession = loadSession().finally(() => {
      inFlightSession = null;
    });
  }
  return inFlightSession;
}

function useSessionHook() {
  const [state, setState] = useState<SessionState>(
    () => cachedSession ?? { data: null, isPending: true }
  );

  const refresh = useCallback(async () => {
    await getSession();
    setState(cachedSession ?? { data: null, isPending: false });
  }, []);

  useEffect(() => {
    const listener = () => {
      setState(cachedSession ?? { data: null, isPending: false });
    };
    listeners.push(listener);

    if (!cachedSession || cachedSession.isPending) {
      refresh();
    } else {
      setState(cachedSession);
    }

    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, [refresh]);

  return state;
}

function clearSessionCache() {
  cachedSession = null;
  notifyListeners();
}

export const authClient = {
  useSession: useSessionHook,

  getSession,

  async signIn(data: { email: string; password: string }) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return { data: null, error: json };

      if (json?.user) {
        cachedSession = {
          data: { user: { image: null, ...json.user } },
          isPending: false,
        };
        notifyListeners();
      }

      return { data: json, error: null };
    } catch (e: any) {
      return {
        data: null,
        error: { message: e.message || "Login failed" },
      };
    }
  },

  async signUp(data: { email: string; password: string; name: string }) {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return { data: null, error: json };
      return { data: json, error: null };
    } catch (e: any) {
      return {
        data: null,
        error: { message: e.message || "Signup failed" },
      };
    }
  },

  async signOut() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    clearSessionCache();
  },
};
