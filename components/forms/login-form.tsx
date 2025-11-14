// components/forms/login-form.tsx

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { Badge } from "../ui/badge";
import Loader from "../loader";

const formSchema = z.object({
  email: z.email({
    message: "لطفاً یک ایمیل معتبر وارد کنید",
  }),
  password: z.string().min(8, {
    message: "رمز عبور باید حداقل ۸ حرف باشد",
  }),
});

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const lastMethod = authClient.getLastUsedLoginMethod();

  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signInWithGoogle = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/auth/google/callback",
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("خطا در ورود با گوگل. لطفاً دوباره تلاش کنید.");
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    // Check user role and redirect accordingly
    try {
      const approvalResponse = await fetch("/api/user/approval-status");

      if (approvalResponse.ok) {
        const { role, approved } = await approvalResponse.json();

        if (!approved) {
          await authClient.signOut();
          toast.error("حساب شما هنوز تایید نشده است");
          setIsLoading(false);
          return;
        }

        toast.success("موفقانه وارد شدید!");

        // Redirect based on role
        if (role === "admin") {
          router.push("/dashboard/admin");
        } else if (role === "staff") {
          router.push("/dashboard/staff");
        } else {
          router.push("/dashboard");
        }
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Error checking user role:", err);
      router.push("/dashboard");
    }

    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border-mechanical shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              خوش آمدید
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              سیستم مدیریت فروشگاه قطعات خودرو
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Loader
              title="در حال ورود به سیستم..."
              subtitle="لطفاً منتظر بمانید"
              size="sm"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-mechanical shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            ورود به سیستم
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            سیستم مدیریت فروشگاه قطعات خودرو
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6">
                <div className="flex flex-col gap-4">
                  <Button
                    variant="outline"
                    className="w-full relative border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    type="button"
                    onClick={signInWithGoogle}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-5 h-5"
                    >
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    ورود با گوگل
                    {lastMethod === "google" && (
                      <Badge className="absolute right-2 text-[10px] bg-primary text-primary-foreground border-primary">
                        آخرین ورود
                      </Badge>
                    )}
                  </Button>
                </div>

                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-card text-muted-foreground relative z-10 px-3">
                    یا با ایمیل وارد شوید
                  </span>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-foreground font-medium">
                              ایمیل
                            </FormLabel>
                            {lastMethod === "email" && (
                              <Badge className="text-[10px] bg-primary text-primary-foreground border-primary">
                                آخرین استفاده
                              </Badge>
                            )}
                          </div>
                          <FormControl>
                            <Input
                              placeholder="m@example.com"
                              {...field}
                              className="border-border focus:border-primary focus:ring-primary/20"
                            />
                          </FormControl>
                          <FormMessage className="text-destructive" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-3">
                    <div className="flex flex-col gap-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground font-medium">
                              رمز عبور
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="********"
                                {...field}
                                type="password"
                                className="border-border focus:border-primary focus:ring-primary/20"
                              />
                            </FormControl>
                            <FormMessage className="text-destructive" />
                          </FormItem>
                        )}
                      />
                      <Link
                        href="/forgot-password"
                        className="ml-auto text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
                      >
                        رمز عبور را فراموش کرده اید؟
                      </Link>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-md"
                  >
                    ورود به سیستم
                  </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  حساب کاربری ندارید؟{" "}
                  <Link
                    href="/signup"
                    className="text-primary hover:text-primary/80 underline underline-offset-4 font-medium transition-colors"
                  >
                    ثبت نام کنید
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-center text-xs text-balance">
        با ادامه دادن، شما با{" "}
        <Link
          href="#"
          className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
        >
          شرایط استفاده
        </Link>{" "}
        و{" "}
        <Link
          href="#"
          className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
        >
          خط مشی رازداری
        </Link>{" "}
        ما موافقت می‌کنید.
      </div>
    </div>
  );
}
