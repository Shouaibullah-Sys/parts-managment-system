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
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import Loader from "../loader";

const formSchema = z.object({
  email: z.email().meta({ description: "لطفاً یک ایمیل معتبر وارد کنید" }),
});

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const { error } = await authClient.forgetPassword({
      email: values.email,
      redirectTo: "/reset-password",
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("ایمیل بازنشانی رمز عبور ارسال شد");
    }

    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              رمز عبور را فراموش کرده اید
            </CardTitle>
            <CardDescription>
              ایمیل خود را وارد کنید تا رمز عبور را بازنشانی کنید
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Loader
              title="در حال ارسال ایمیل..."
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
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">رمز عبور را فراموش کرده اید</CardTitle>
          <CardDescription>
            ایمیل خود را وارد کنید تا رمز عبور را بازنشانی کنید
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ایمیل</FormLabel>
                        <FormControl>
                          <Input placeholder="m@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full">
                  بازنشانی رمز عبور
                </Button>
              </div>
              <div className="text-center text-sm">
                حساب کاربری ندارید؟{" "}
                <Link href="/signup" className="underline underline-offset-4">
                  ثبت نام کنید
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        با ادامه دادن، شما با <Link href="#">شرایط استفاده</Link> و{" "}
        <Link href="#">خط مشی رازداری</Link> ما موافقت می‌کنید.
      </div>
    </div>
  );
}
