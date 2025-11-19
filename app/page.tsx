"use client";
import { ModeSwitcher } from "@/components/mode-switcher";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function Home() {
  const containerRef = useRef(null);
  const logoRef = useRef(null);
  const headingRef = useRef(null);
  const textRef = useRef(null);
  const buttonsRef = useRef(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    const initDark =
      (mq && mq.matches) || document.documentElement.classList.contains("dark");
    setIsDark(initDark);

    const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq?.addEventListener?.("change", listener);
    return () => mq?.removeEventListener?.("change", listener);
  }, []);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(
      logoRef.current,
      { opacity: 0, scale: 0.6, y: -40 },
      { opacity: 1, scale: 1, y: 0, duration: 1 }
    )
      .fromTo(
        headingRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 },
        "-=0.4"
      )
      .fromTo(
        textRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 },
        "-=0.5"
      )
      .fromTo(
        buttonsRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 },
        "-=0.5"
      );
  }, []);

  return (
    <>
      <header className="absolute top-0 left-0 right-0 flex justify-end items-center p-4 z-50">
        <ModeSwitcher />
      </header>

      {/* Background image */}
      <div
        className="min-h-screen w-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/background.jpg')` }}
      >
        <div
          ref={containerRef}
          className="backdrop-blur-xs  dark:bg-black/60 flex flex-col gap-6 items-center justify-center min-h-screen px-6 text-center transition-colors"
        >
          {/* Main Logo */}
          <div ref={logoRef}>
            <Image
              src={isDark ? "/logo.png" : "/logo.png"}
              alt="Auto Parts Benz"
              width={200}
              height={200}
            />
          </div>

          {/* Main Heading in Dari */}
          <h1
            ref={headingRef}
            className="text-5xl font-extrabold tracking-tight text-[#a00000]"
            dir="rtl"
          >
            سیستم مدیریت قطعات بنز
          </h1>

          {/* Description */}
          <p
            ref={textRef}
            className="text-lg max-w-2xl text-gray-300 dark:text-gray-200 leading-relaxed"
            dir="rtl"
          >
            یک سیستم جامع، مدرن و پیشرفته برای مدیریت موجودی، ردیابی سفارش‌ها،
            ثبت مشتریان و مدیریت فروش در نمایندگی و فروشگاه قطعات مرسدس‌بنز. با
            استفاده از این پلتفرم، کارهای روزانه خود را سریع‌تر، دقیق‌تر و
            حرفه‌ای‌تر انجام دهید.
          </p>

          {/* Buttons */}
          <div ref={buttonsRef} className="flex gap-4 mt-3" dir="rtl">
            <Link href="/login">
              <Button className="bg-[#8B0000] hover:bg-[#a30000] text-white px-8 py-3 text-lg">
                ورود
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gray-300 dark:bg-gray-300 dark:text-black text-[#ad0000] hover:bg-gray-100 px-8 py-3 text-lg">
                ثبت‌نام
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
