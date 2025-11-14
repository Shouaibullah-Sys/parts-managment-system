//app/login/page.tsx

"use client";

import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Loader from "@/components/loader";

export default function LoginPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await authClient.getSession();

        if (session?.data?.user) {
          const approvalResponse = await fetch("/api/user/approval-status");

          if (approvalResponse.ok) {
            const { role, approved } = await approvalResponse.json();

            if (approved) {
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
      <div className="flex min-h-svh items-center justify-center bg-mechanical">
        <Loader
          title="در حال بررسی احراز هویت..."
          subtitle="لطفاً منتظر بمانید"
          size="md"
        />
      </div>
    );
  }

  return (
    <div className="bg-mechanical flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-3 self-center font-bold text-xl text-foreground hover:text-primary transition-colors"
        >
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg shadow-lg">
            <Image
              width={40}
              height={40}
              src={"/diplomasi.jpg"}
              alt="دیپلوماسی لیمتد"
              priority
              className="rounded-md"
            />
          </div>
          <span className="bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            دیپلوماسی لیمتد
          </span>
        </Link>
        <LoginForm />
      </div>
    </div>
  );
}
