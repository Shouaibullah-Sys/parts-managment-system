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

let cachedSession: SessionState | null = null;
let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>(() => {
    if (cachedSession) return cachedSession;
    return { data: null, isPending: true };
  });

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        cachedSession = { data: null, isPending: false };
      } else {
        const data = await res.json();
        cachedSession = { data, isPending: false };
      }
    } catch {
      cachedSession = { data: null, isPending: false };
    }
    setState(cachedSession!);
    notifyListeners();
  }, []);

  useEffect(() => {
    const listener = () => {
      if (cachedSession) {
        setState(cachedSession);
      }
    };
    listeners.push(listener);

    if (!cachedSession || cachedSession.isPending) {
      fetchSession();
    } else {
      setState(cachedSession);
    }

    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, [fetchSession]);

  return state;
}
