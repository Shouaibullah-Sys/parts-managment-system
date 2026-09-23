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
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const { data, error } = await authClient.signIn({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    const u = data?.user;

    if (u && !u.approved) {
      await authClient.signOut();
      toast.error("حساب شما هنوز تایید نشده است");
      setIsLoading(false);
      return;
    }

    toast.success("موفقانه وارد شدید!");

    router.replace(
      u?.role === "admin"
        ? "/dashboard/admin"
        : u?.role === "staff"
          ? "/dashboard/staff"
          : "/dashboard"
    );

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
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-medium">
                            ایمیل
                          </FormLabel>
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
