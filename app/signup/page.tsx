"use client";

import Link from "next/link";
import { SignupForm } from "@/components/forms/signup-form";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Loader from "@/components/loader";

export default function SignupPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await authClient.getSession();

        if (session?.data?.user) {
          // User is already logged in, check their role and redirect
          const approvalResponse = await fetch("/api/user/approval-status");

          if (approvalResponse.ok) {
            const { role, approved } = await approvalResponse.json();

            if (approved) {
              // Redirect based on role
              if (role === "admin") {
                router.push("/dashboard/admin");
              } else if (role === "staff") {
                router.push("/dashboard/staff");
              } else {
                router.push("/dashboard");
              }
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader
          title="Checking authentication..."
          subtitle="Please wait"
          size="md"
        />
      </div>
    );
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <Image
              width={50}
              height={50}
              src={"/diplomasi.jpg"}
              alt="diplomasi ltd"
              priority
            />
          </div>
          Diplomasi LTD
        </Link>
        <SignupForm />
      </div>
    </div>
  );
}
