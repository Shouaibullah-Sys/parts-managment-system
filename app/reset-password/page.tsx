// app/reset-password/page.tsx
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import Image from "next/image";

function ResetPasswordFormWrapper() {
  return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<div>در حال بارگیری...</div>}>
          <ResetPasswordFormWrapper />
        </Suspense>
      </div>
    </div>
  );
}
