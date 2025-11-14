// app/forgot-password/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";

export default function ForgotPasswordPage() {
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
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
