// app/auth/google/callback/page.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Loader from "@/components/loader";

export default function GoogleCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        // Get the current session after Google OAuth
        const session = await authClient.getSession();

        if (session?.data?.user) {
          // Check if user is approved
          const approvalResponse = await fetch("/api/user/approval-status");

          if (approvalResponse.ok) {
            const { approved, role } = await approvalResponse.json();

            if (!approved) {
              await authClient.signOut();
              router.push("/login?error=not-approved");
              return;
            }

            // Redirect based on user role
            if (role === "admin") {
              router.push("/dashboard/admin");
            } else {
              router.push("/dashboard/staff");
            }
          } else {
            // Fallback to dashboard if status check fails
            router.push("/");
          }
        } else {
          // No session, redirect to login
          router.push("/login?error=auth-failed");
        }
      } catch (error) {
        console.error("Error handling Google callback:", error);
        router.push("/login?error=callback-failed");
      }
    };

    handleGoogleCallback();
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-96 bg-mechanical">
      <Loader
        title="در حال تکمیل ورود..."
        subtitle="لطفاً منتظر بمانید"
        size="sm"
      />
    </div>
  );
}
