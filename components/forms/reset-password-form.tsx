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
import { useRouter, useSearchParams } from "next/navigation";
import Loader from "../loader";

const formSchema = z
  .object({
    password: z.string().min(8, {
      message: "رمز عبور باید حداقل ۸ حرف باشد",
    }),
    confirmPassword: z.string().min(8, {
      message: "تأیید رمز عبور باید حداقل ۸ حرف باشد",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "رمزهای عبور مطابقت ندارند",
    path: ["confirmPassword"],
  });

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") as string;

  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("رمز عبور با موفقیت بازنشانی شد");
      router.push("/login");
    }

    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">بازنشانی رمز عبور</CardTitle>
            <CardDescription>رمز عبور جدید خود را وارد کنید</CardDescription>
          </CardHeader>
          <CardContent>
            <Loader
              title="در حال بازنشانی رمز عبور..."
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
          <CardTitle className="text-xl">بازنشانی رمز عبور</CardTitle>
          <CardDescription>رمز عبور جدید خود را وارد کنید</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رمز عبور</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="رمز عبور جدید خود را وارد کنید"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تأیید رمز عبور</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="رمز عبور را دوباره وارد کنید"
                          />
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
