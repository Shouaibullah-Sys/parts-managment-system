"use client";

import { useEffect, useState } from "react";
import { isRemoteHost } from "@/lib/remote-mode";

/**
 * Shown only when the app is opened through the public hostname (read-only).
 * Purely informational — the actual enforcement happens in middleware.
 */
export function ReadOnlyBanner() {
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    setReadOnly(isRemoteHost(window.location.hostname));
  }, []);

  if (!readOnly) return null;

  return (
    <div
      dir="rtl"
      role="status"
      className="fixed bottom-3 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-900 shadow-md dark:border-amber-900/50 dark:bg-amber-950/90 dark:text-amber-200"
    >
      حالت مشاهده — فقط خواندن (امکان ثبت یا تغییر اطلاعات وجود ندارد)
    </div>
  );
}
